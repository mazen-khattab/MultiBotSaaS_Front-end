import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import type { SignalREventHandler } from "@/services/realtime/signalr.types"

/** Re-read completion state rather than inventing timestamps or adding counters. */
export function createRunRealtimeHandler(client: QueryClient): SignalREventHandler<"ScrapeCompleted"> {
  return async ({ scrapeId }) => {
    // No bot/account IDs are supplied. All matching lists keep their existing
    // bot, pagination, and filters; only this known scrape's detail is targeted.
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.runs.lists() }),
      client.invalidateQueries({ queryKey: queryKeys.runs.detail(scrapeId) }),
      // Completion releases an account; existing eligibility and management
      // reads remain authoritative, as with the run-mutation invalidations.
      client.invalidateQueries({ queryKey: queryKeys.accounts.all }),
      // New leads also change the counts displayed in existing group details.
      client.invalidateQueries({ queryKey: queryKeys.groups.details() }),
    ])
  }
}
