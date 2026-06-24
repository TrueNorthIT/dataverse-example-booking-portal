import { useIsFetching, useIsMutating } from "@tanstack/react-query"

export function GlobalProgressBar() {
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const active = fetching + mutating > 0

  if (!active) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20">
      <div className="animate-progress-bar h-full w-1/3 rounded-full bg-primary" />
    </div>
  )
}
