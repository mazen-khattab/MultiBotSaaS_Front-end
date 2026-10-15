import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"

/** One policy per session-owned cache; events have no replay cursor or versions. */
export function createReconnectPolicy(client: QueryClient) {
  let handledVersion = 0
  return async (recoveryVersion: number): Promise<void> => {
    if (recoveryVersion <= handledVersion) return
    // Record before awaiting so StrictMode/effect replays cannot start the same
    // recovery twice. Several gaps batched into one render need one current read.
    handledVersion = recoveryVersion
    await Promise.all([
      queryKeys.leads.all, // Includes the separately cached messaging quota preview.
      queryKeys.runs.all, // Existing history and detail services, never a Job API.
      queryKeys.accounts.all, // Account availability can change while disconnected.
      queryKeys.groups.details(), // Completion can change related-lead counts.
    ].map((queryKey) => client.invalidateQueries({ queryKey, refetchType: "active" })))
    // Inactive entries become stale for their next mount. Existing query functions
    // retain their own bot, page and filters; disabled queries are never enabled.
  }
}
