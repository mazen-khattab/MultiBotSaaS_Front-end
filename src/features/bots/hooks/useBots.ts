import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { BotsService } from "@/features/bots/services/BotsService"

/** Distinguish catalog, subscriptions, and ownership-scoped details in cache. */
export function useBots() {
  return useQuery({ queryKey: queryKeys.bots.list({ subscribed: false }), queryFn: ({ signal }) => BotsService.getBots(signal) })
}

export function useSubscribedBots() {
  return useQuery({ queryKey: queryKeys.bots.list({ subscribed: true }), queryFn: ({ signal }) => BotsService.getSubscribedBots(signal) })
}

export function useBot(id: number, requireOwnership = true) {
  return useQuery({
    queryKey: [...queryKeys.bots.detail(id), { requireOwnership }],
    queryFn: ({ signal }) => BotsService.getBot(id, requireOwnership, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}
