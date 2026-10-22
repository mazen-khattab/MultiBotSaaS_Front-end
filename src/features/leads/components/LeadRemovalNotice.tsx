import { useLocation } from "react-router-dom"

/** Show acknowledgment only in the workspace that initiated removal. */
export function LeadRemovalNotice({ botId }: { readonly botId: number }) {
  const { state } = useLocation()
  const removed = (state as { removedLead?: { botId?: unknown; leadId?: unknown } } | null)?.removedLead
  if (removed?.botId !== botId || typeof removed.leadId !== "number" || !Number.isSafeInteger(removed.leadId) || removed.leadId <= 0) return null
  return <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">Lead #{removed.leadId} removed.</p>
}
