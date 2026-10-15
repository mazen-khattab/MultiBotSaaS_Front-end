import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import type { SignalREventHandlers } from "@/services/realtime/signalr.types"

/** Both events can change list membership and the separately cached quota preview. */
export function createLeadRealtimeHandlers(client: QueryClient): Pick<SignalREventHandlers, "ScrapeCompleted" | "LeadStatusUpdated"> {
  // There is no bot mapping or row version in either payload. A status patch
  // could leave filtered pages/totals wrong, and completion counts are not totals.
  const reconcile = () => client.invalidateQueries({ queryKey: queryKeys.leads.all })
  return { ScrapeCompleted: reconcile, LeadStatusUpdated: reconcile }
}
