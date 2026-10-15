import { HubConnectionState } from "@microsoft/signalr"
import { useContext } from "react"

import { useAuth } from "@/context/auth/useAuth"
import { RealtimeContext } from "@/context/realtime/RealtimeContext"
import { Button } from "@/shared/ui/button"

/** Browser notification health is independent of worker execution or job status. */
export function RealtimeConnectionStatus() {
  const { status: authStatus } = useAuth()
  // The shared shell can also render outside realtime integration. Only the
  // authenticated app's provider can supply an actual connection state.
  const realtime = useContext(RealtimeContext)
  if (authStatus !== "authenticated" || !realtime || realtime.status === HubConnectionState.Connected) return null

  const label = realtime.status === HubConnectionState.Reconnecting ? "Live updates reconnecting."
    : realtime.status === HubConnectionState.Connecting ? "Connecting live updates."
      : realtime.status === "Unavailable" ? "Live updates unavailable." : "Live updates disconnected."

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:px-6 lg:px-8">
      <p role="status">
        <span className="font-medium">{label}</span>{" "}
        Backend jobs run independently of this browser connection. Refresh a view to check its current state.
      </p>
      {realtime.status === HubConnectionState.Disconnected ? (
        <Button variant="ghost" size="sm" onClick={() => { void realtime.retry().catch(() => undefined) }}>
          Retry live updates
        </Button>
      ) : null}
    </div>
  )
}
