import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import type { SignalREventHandler } from "@/services/realtime/signalr.types"

/** Reconcile the existing dispatch-related reads without inventing a Job read API. */
export function createJobRealtimeHandler(client: QueryClient): SignalREventHandler<"JobFailed"> {
  return async () => {
    // This watchdog event has no recipient/account/bot scope. Reuse the same
    // read scopes as messaging dispatch; never use jobId as a scrape/run ID or
    // fabricate a failure status, delivery result, or quota decrement in caches.
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.leads.all }),
      client.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    ])
  }
}
