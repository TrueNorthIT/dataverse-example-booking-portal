import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useRealtime,
  type DataChangeEvent,
  type RealtimeState,
} from "@truenorth-it/dataverse-client"
import { useAuth0 } from "@auth0/auth0-react"
import { useDataverse } from "@/hooks/useDataverse"
import { logger } from "@/lib/logger"

const TABLE_QUERY_KEYS: Record<string, readonly (readonly unknown[])[]> = {
  booking: [["availability"], ["todaysBusyness"], ["myBookings"]],
  servicebooking: [["availability"], ["todaysBusyness"], ["myBookings"]],
}

export interface RealtimeEvent {
  table: string
  action: string
  recordId: string
  timestamp: string
  receivedAt: number
}

interface RealtimeContextValue extends RealtimeState {
  events: RealtimeEvent[]
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  error: null,
  events: [],
})

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth0()
  const client = useDataverse()
  const queryClient = useQueryClient()
  const [events, setEvents] = useState<RealtimeEvent[]>([])

  const negotiate = useCallback(async () => {
    try {
      return await client.negotiate()
    } catch (err) {
      logger.error("[Realtime] SignalR negotiate failed", err)
      throw err
    }
  }, [client])

  const onEvent = useCallback((event: DataChangeEvent) => {
    if (!TABLE_QUERY_KEYS[event.table]) {
      logger.warn(
        `[Realtime] No query keys mapped for table '${event.table}'. Known tables: ${Object.keys(TABLE_QUERY_KEYS).join(", ")}`
      )
    }
    setEvents((prev) => [
      { ...event, receivedAt: Date.now() },
      ...prev.slice(0, 19), // keep last 20
    ])
  }, [])

  const state = useRealtime({
    negotiate,
    queryClient,
    tableQueryKeys: TABLE_QUERY_KEYS,
    onEvent,
    enabled: isAuthenticated,
  })

  return (
    <RealtimeContext.Provider value={{ ...state, events }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext)
}
