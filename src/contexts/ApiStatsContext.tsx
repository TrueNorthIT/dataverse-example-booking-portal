import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"

interface CallRecord {
  id: string
  queryKey: string
  status: "pending" | "success" | "error"
  startTime: number
  duration: number | null
}

interface ApiStats {
  totalCalls: number
  activeCalls: number
  avgDuration: number
  recentCalls: CallRecord[]
}

const MAX_RECENT = 50

const ApiStatsContext = createContext<ApiStats | null>(null)

export function ApiStatsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const storeRef = useRef<ApiStats>({
    totalCalls: 0,
    activeCalls: 0,
    avgDuration: 0,
    recentCalls: [],
  })
  const listenersRef = useRef(new Set<() => void>())
  const pendingMapRef = useRef(new Map<string, number>()) // id -> startTime
  const totalDurationRef = useRef(0)
  const completedCountRef = useRef(0)

  const emit = useCallback(() => {
    for (const listener of listenersRef.current) listener()
  }, [])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      listenersRef.current.add(onStoreChange)

      const queryUnsub = queryClient.getQueryCache().subscribe((event) => {
        if (!event?.query) return
        const key = JSON.stringify(event.query.queryKey)
        const id = `q-${key}-${event.query.queryHash}`

        if (event.type === "updated") {
          const status = event.query.state.status
          if (status === "pending") {
            pendingMapRef.current.set(id, Date.now())
            storeRef.current = {
              ...storeRef.current,
              totalCalls: storeRef.current.totalCalls + 1,
              activeCalls: pendingMapRef.current.size,
              recentCalls: [
                { id, queryKey: key, status: "pending" as const, startTime: Date.now(), duration: null },
                ...storeRef.current.recentCalls,
              ].slice(0, MAX_RECENT),
            }
            emit()
          } else if (status === "success" || status === "error") {
            const startTime = pendingMapRef.current.get(id)
            pendingMapRef.current.delete(id)
            const duration = startTime ? Date.now() - startTime : null
            if (duration != null) {
              totalDurationRef.current += duration
              completedCountRef.current += 1
            }
            const resolvedStatus = status as "success" | "error"
            storeRef.current = {
              ...storeRef.current,
              activeCalls: pendingMapRef.current.size,
              avgDuration:
                completedCountRef.current > 0
                  ? Math.round(totalDurationRef.current / completedCountRef.current)
                  : 0,
              recentCalls: storeRef.current.recentCalls.map((c) =>
                c.id === id
                  ? { ...c, status: resolvedStatus, duration }
                  : c,
              ),
            }
            emit()
          }
        }
      })

      const mutationUnsub = queryClient.getMutationCache().subscribe((event) => {
        if (!event?.mutation) return
        const key = JSON.stringify(event.mutation.options.mutationKey ?? ["mutation"])
        const id = `m-${event.mutation.mutationId}`

        if (event.type === "updated") {
          const status = event.mutation.state.status
          if (status === "pending") {
            pendingMapRef.current.set(id, Date.now())
            storeRef.current = {
              ...storeRef.current,
              totalCalls: storeRef.current.totalCalls + 1,
              activeCalls: pendingMapRef.current.size,
              recentCalls: [
                { id, queryKey: key, status: "pending" as const, startTime: Date.now(), duration: null },
                ...storeRef.current.recentCalls,
              ].slice(0, MAX_RECENT),
            }
            emit()
          } else if (status === "success" || status === "error") {
            const startTime = pendingMapRef.current.get(id)
            pendingMapRef.current.delete(id)
            const duration = startTime ? Date.now() - startTime : null
            if (duration != null) {
              totalDurationRef.current += duration
              completedCountRef.current += 1
            }
            const resolvedStatus = status as "success" | "error"
            storeRef.current = {
              ...storeRef.current,
              activeCalls: pendingMapRef.current.size,
              avgDuration:
                completedCountRef.current > 0
                  ? Math.round(totalDurationRef.current / completedCountRef.current)
                  : 0,
              recentCalls: storeRef.current.recentCalls.map((c) =>
                c.id === id
                  ? { ...c, status: resolvedStatus, duration }
                  : c,
              ),
            }
            emit()
          }
        }
      })

      return () => {
        listenersRef.current.delete(onStoreChange)
        queryUnsub()
        mutationUnsub()
      }
    },
    [queryClient, emit],
  )

  const getSnapshot = useCallback(() => storeRef.current, [])

  const stats = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return <ApiStatsContext.Provider value={stats}>{children}</ApiStatsContext.Provider>
}

export function useApiStats(): ApiStats {
  const ctx = useContext(ApiStatsContext)
  if (!ctx) throw new Error("useApiStats must be used within ApiStatsProvider")
  return ctx
}
