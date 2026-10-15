import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"

import { useAuth } from "@/context/auth/useAuth"
import { useRealtime } from "@/context/realtime/useRealtime"
import { createReconnectPolicy } from "@/core/realtime/reconnectPolicy"
import { createJobRealtimeHandler } from "@/features/jobs/realtime/jobRealtimeHandlers"
import { createLeadRealtimeHandlers } from "@/features/leads/realtime/leadRealtimeHandlers"
import { createRunRealtimeHandler } from "@/features/runs/realtime/runRealtimeHandlers"

/** Bind feature decisions to the current session's cache, outside the hub core. */
export function RealtimeEventBridge() {
  const client = useQueryClient()
  const { subscribe, recoveryVersion } = useRealtime()
  const { status } = useAuth()
  const recover = useMemo(() => createReconnectPolicy(client), [client])

  useEffect(() => {
    if (status !== "authenticated") return
    // Query reads surface their own errors and retry controls. A read failure
    // does not mean the notification transport or a backend job has failed.
    void recover(recoveryVersion).catch(() => undefined)
  }, [recover, recoveryVersion, status])

  useEffect(() => {
    if (status !== "authenticated") return
    let active = true
    const onRunCompleted = createRunRealtimeHandler(client)
    const leadHandlers = createLeadRealtimeHandlers(client)
    const onJobFailed = createJobRealtimeHandler(client)
    const unsubscribe = [
      subscribe("ScrapeCompleted", async (payload) => {
        if (!active) return
        await Promise.all([onRunCompleted(payload), leadHandlers.ScrapeCompleted(payload)])
      }),
      subscribe("LeadStatusUpdated", (payload) => {
        if (active) return leadHandlers.LeadStatusUpdated(payload)
      }),
      subscribe("JobFailed", (payload) => {
        if (active) return onJobFailed(payload)
      }),
    ]
    return () => {
      // Also guard captured callbacks that were already queued during teardown.
      active = false
      for (const remove of unsubscribe) remove()
    }
  }, [client, subscribe, status])

  return null
}
