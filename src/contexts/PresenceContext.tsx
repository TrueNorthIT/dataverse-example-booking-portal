import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { WebPubSubClient } from "@azure/web-pubsub-client"
import { logger } from "@/lib/logger"
import { PRESENCE } from "@/lib/constants"

const { HEARTBEAT_MS, CLEANUP_MS, STALE_MS, FLASH_MS, JWT_TTL_SECS } = PRESENCE
const HUB = "presence"

// SECURITY: the Web PubSub client-access token is minted in the browser for the
// demo only. In production, issue it from a trusted backend — never ship the
// access key to the client.

// --- Browser-side JWT generation for Web PubSub (demo only) ---

function base64UrlEncode(data: Uint8Array): string {
  let binary = ""
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function generateClientAccessUrl(
  endpoint: string,
  key: string,
  userId: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })))

  const now = Math.floor(Date.now() / 1000)
  const payload = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        aud: `${endpoint}/client/hubs/${HUB}`,
        sub: userId,
        iat: now,
        exp: now + JWT_TTL_SECS,
        role: ["webpubsub.joinLeaveGroup", "webpubsub.sendToGroup"],
      }),
    ),
  )

  const signingInput = `${header}.${payload}`
  // Azure Web PubSub expects the key used as raw UTF-8 bytes (not base64-decoded)
  const keyData = encoder.encode(key)
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = base64UrlEncode(
    new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signingInput))),
  )

  return `${endpoint}/client/hubs/${HUB}?access_token=${header}.${payload}.${signature}`
}

type ViewerMap = Map<string, Map<string, number>> // slotStart → userId → lastSeen

interface PresenceMessage {
  type: "viewing" | "left" | "heartbeat"
  userId: string
  resourceId: string
  date: string
  slotStart?: string
}

interface PresenceContextValue {
  broadcastViewing: (resourceId: string, date: string, slotStart: string) => void
  broadcastLeft: () => void
  viewersForSlot: (slotStart: string) => number
  /** Slot starts that just got a new viewer — auto-clears after 2.5s */
  flashingSlots: Set<string>
}

const PresenceContext = createContext<PresenceContextValue>({
  broadcastViewing: () => {},
  broadcastLeft: () => {},
  viewersForSlot: () => 0,
  flashingSlots: new Set(),
})

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth0()
  const userId = user?.sub ?? ""

  const clientRef = useRef<WebPubSubClient | null>(null)
  const [viewers, setViewers] = useState<ViewerMap>(new Map())
  const [flashingSlots, setFlashingSlots] = useState<Set<string>>(new Set())
  const flashTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const currentGroupRef = useRef<string | null>(null)
  const currentSlotRef = useRef<string | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cleanupRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connectedRef = useRef(false)

  // Track current broadcast params for heartbeat
  const currentParamsRef = useRef<{ resourceId: string; date: string; slotStart: string } | null>(null)

  const endpoint = import.meta.env.VITE_WEBPUBSUB_URL as string | undefined
  const accessKey = import.meta.env.VITE_WEBPUBSUB_KEY as string | undefined

  // Connect on mount
  useEffect(() => {
    if (!endpoint || !accessKey || !isAuthenticated || !userId) return

    const client = new WebPubSubClient({
      getClientAccessUrl: () => generateClientAccessUrl(endpoint, accessKey, userId),
    })
    clientRef.current = client

    client.on("group-message", (e) => {
      try {
        const msg = e.message.data as unknown as PresenceMessage
        if (!msg || msg.userId === userId) return

        if (msg.type === "left") {
          setViewers((prev) => {
            const next = new Map(prev)
            for (const [slot, users] of next) {
              const updated = new Map(users)
              updated.delete(msg.userId)
              if (updated.size === 0) next.delete(slot)
              else next.set(slot, updated)
            }
            return next
          })
          return
        }

        // viewing or heartbeat
        if (msg.slotStart) {
          const slot = msg.slotStart
          setViewers((prev) => {
            const next = new Map(prev)

            // Remove this user from any other slot they were previously viewing
            for (const [otherSlot, users] of next) {
              if (otherSlot !== slot && users.has(msg.userId)) {
                const updated = new Map(users)
                updated.delete(msg.userId)
                if (updated.size === 0) next.delete(otherSlot)
                else next.set(otherSlot, updated)
              }
            }

            const prevUsers = next.get(slot)
            const wasEmpty = !prevUsers || prevUsers.size === 0
            const users = new Map(prevUsers ?? new Map())
            users.set(msg.userId, Date.now())
            next.set(slot, users)

            // Flash when a slot goes from 0 → 1 viewers (new interest)
            if (wasEmpty && msg.type === "viewing") {
              setFlashingSlots((prev) => new Set(prev).add(slot))
              // Clear previous timer if any
              const existing = flashTimersRef.current.get(slot)
              if (existing) clearTimeout(existing)
              flashTimersRef.current.set(slot, setTimeout(() => {
                setFlashingSlots((prev) => {
                  const next = new Set(prev)
                  next.delete(slot)
                  return next
                })
                flashTimersRef.current.delete(slot)
              }, FLASH_MS))
            }

            return next
          })
        }
      } catch {
        // Ignore malformed messages
      }
    })

    client.start().then(() => {
      connectedRef.current = true
    }).catch((err) => {
      logger.warn("[Presence] Connection failed, presence disabled:", err)
      connectedRef.current = false
    })

    // Stale cleanup interval
    const cleanup = setInterval(() => {
      const now = Date.now()
      setViewers((prev) => {
        const next = new Map(prev)
        let changed = false
        for (const [slot, users] of next) {
          const updated = new Map(users)
          for (const [uid, lastSeen] of updated) {
            if (now - lastSeen > STALE_MS) {
              updated.delete(uid)
              changed = true
            }
          }
          if (updated.size === 0) { next.delete(slot); changed = true }
          else next.set(slot, updated)
        }
        return changed ? next : prev
      })
    }, CLEANUP_MS)
    cleanupRef.current = cleanup

    // Capture the ref's (stable) Map so cleanup doesn't read a possibly-changed ref
    const flashTimers = flashTimersRef.current
    return () => {
      clearInterval(cleanup)
      for (const t of flashTimers.values()) clearTimeout(t)
      flashTimers.clear()
      client.stop()
      connectedRef.current = false
      clientRef.current = null
    }
  }, [endpoint, accessKey, isAuthenticated, userId])

  const sendToGroup = useCallback(async (group: string, msg: PresenceMessage) => {
    const client = clientRef.current
    if (!client || !connectedRef.current) return
    try {
      await client.sendToGroup(group, msg, "json")
    } catch {
      // Silently ignore send failures
    }
  }, [])

  const broadcastViewing = useCallback((resourceId: string, date: string, slotStart: string) => {
    if (!userId) return
    const group = `resource:${resourceId}:${date}`
    const msg: PresenceMessage = { type: "viewing", userId, resourceId, date, slotStart }

    // Join new group if needed
    const client = clientRef.current
    if (client && connectedRef.current && currentGroupRef.current !== group) {
      // Leave old group
      if (currentGroupRef.current) {
        client.leaveGroup(currentGroupRef.current).catch(() => {})
      }
      client.joinGroup(group).catch(() => {})
      currentGroupRef.current = group
    }

    currentSlotRef.current = slotStart
    currentParamsRef.current = { resourceId, date, slotStart }
    sendToGroup(group, msg)

    // Reset heartbeat
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(() => {
      const params = currentParamsRef.current
      if (!params) return
      const hbGroup = `resource:${params.resourceId}:${params.date}`
      sendToGroup(hbGroup, { type: "heartbeat", userId, ...params })
    }, HEARTBEAT_MS)
  }, [userId, sendToGroup])

  const broadcastLeft = useCallback(() => {
    if (!userId) return

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    const group = currentGroupRef.current
    if (group) {
      const params = currentParamsRef.current
      sendToGroup(group, {
        type: "left",
        userId,
        resourceId: params?.resourceId ?? "",
        date: params?.date ?? "",
      })
    }

    currentSlotRef.current = null
    currentParamsRef.current = null
  }, [userId, sendToGroup])

  const viewersForSlot = useCallback((slotStart: string): number => {
    return viewers.get(slotStart)?.size ?? 0
  }, [viewers])

  return (
    <PresenceContext.Provider value={{ broadcastViewing, broadcastLeft, viewersForSlot, flashingSlots }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresenceContext() {
  return useContext(PresenceContext)
}
