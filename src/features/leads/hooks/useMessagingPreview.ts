import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { LeadsService } from "@/features/leads/services/LeadsService"

/** Quota and eligibility are server state, independent of the paginated list. */
export function useMessagingPreview(botId: number) {
  return useQuery({
    queryKey: queryKeys.leads.messagingPreview(botId),
    queryFn: ({ signal }) => LeadsService.getMessagingPreview(botId, signal),
    refetchOnMount: "always",
  })
}
