import { useState, useEffect, useReducer } from "react"
import { Activity, Clock, CheckCircle2, XCircle, Zap, Radio } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useApiStats } from "@/contexts/ApiStatsContext"
import { useRealtimeStatus } from "@/contexts/RealtimeContext"

const BUILD = "011"
const BUILT_AT = "2026-03-05T22:20Z"

function timeSinceBuild() {
  const diff = Date.now() - new Date(BUILT_AT).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h${mins % 60}m ago`
}

function secsAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000)
  return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m${s % 60}s ago`
}

export function ApiStatsPanel() {
  const [open, setOpen] = useState(false)
  const { totalCalls, activeCalls, avgDuration, recentCalls } = useApiStats()
  const { connected, error: rtError, events: rtEvents } = useRealtimeStatus()
  const busy = activeCalls > 0

  // tick every second so the "Xs ago" stays live
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!open || rtEvents.length === 0) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [open, rtEvents.length])

  return (
    <div className="fixed bottom-14 right-4 z-40 flex flex-col items-end gap-2">
      {/* Expanded card */}
      {open && (
        <div className="w-72 max-h-[50vh] overflow-y-auto rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur-lg animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">API / Realtime</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          {/* Summary row */}
          <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded bg-muted/50 px-1.5 py-1">
              <div className="text-sm font-bold">{totalCalls}</div>
              <div className="text-[9px] text-muted-foreground">Total</div>
            </div>
            <div className="rounded bg-muted/50 px-1.5 py-1">
              <div className="text-sm font-bold">{activeCalls}</div>
              <div className="text-[9px] text-muted-foreground">In-flight</div>
            </div>
            <div className="rounded bg-muted/50 px-1.5 py-1">
              <div className="text-sm font-bold">{avgDuration}<span className="text-[9px] font-normal">ms</span></div>
              <div className="text-[9px] text-muted-foreground">Avg</div>
            </div>
          </div>

          {/* Realtime status */}
          <div className="mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Radio className="h-3 w-3" />
              <span className="font-semibold">SignalR</span>
              <span className={`ml-auto inline-flex items-center gap-1 text-[10px] font-medium ${connected ? "text-emerald-600" : rtError ? "text-red-500" : "text-muted-foreground"}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : rtError ? "bg-red-500" : "bg-gray-400"}`} />
                {connected ? "Connected" : rtError ? "Error" : "Disconnected"}
              </span>
            </div>
            {rtError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-1 text-[10px] text-red-600 dark:text-red-400 mb-1.5">
                {rtError}
              </div>
            )}
            {rtEvents.length > 0 ? (
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {rtEvents.map((evt, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md px-2 py-0.5 text-[10px] hover:bg-muted/50">
                    <span className={`shrink-0 font-mono font-semibold ${evt.action === "created" ? "text-emerald-600" : evt.action === "deleted" ? "text-red-500" : "text-amber-500"}`}>
                      {evt.action}
                    </span>
                    <span className="truncate flex-1 font-mono">{evt.table}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {secsAgo(evt.receivedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : connected ? (
              <p className="text-[10px] text-muted-foreground text-center py-1">Listening — no events yet</p>
            ) : null}
          </div>

          <div className="border-t pt-1.5 mb-1.5" />

          {/* Recent calls */}
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {recentCalls.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No calls yet</p>
            )}
            {recentCalls.map((call) => (
              <div
                key={call.id + call.startTime}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/50"
              >
                {call.status === "pending" && (
                  <Clock className="h-3 w-3 shrink-0 text-amber-500 animate-pulse" />
                )}
                {call.status === "success" && (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                )}
                {call.status === "error" && (
                  <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                )}
                <span className="truncate flex-1 font-mono">{call.queryKey}</span>
                <span className="shrink-0 text-muted-foreground">
                  {call.duration != null ? `${call.duration}ms` : "..."}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 shadow-md backdrop-blur-lg transition-all hover:shadow-lg text-xs"
      >
        <div className="relative">
          <Activity className="h-4 w-4" />
          {busy && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </div>
        <Badge variant="secondary" className="tabular-nums text-[10px] px-1.5 py-0">
          {totalCalls}
        </Badge>
        {busy && (
          <Badge variant="default" className="tabular-nums text-[10px] px-1.5 py-0 gap-1">
            <Zap className="h-2.5 w-2.5" />
            {activeCalls}
          </Badge>
        )}
        <span className="flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-gray-400"}`} />
          {connected && <span className="text-[10px] text-emerald-600 font-medium">Live</span>}
        </span>
        <span className="text-[9px] text-muted-foreground/60 font-mono" title={`Built ${BUILT_AT}`}>b{BUILD} {timeSinceBuild()}</span>
      </button>
    </div>
  )
}
