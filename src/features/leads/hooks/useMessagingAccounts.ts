import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { EligibleAccountsService } from "@/features/runs/services/EligibleAccountsService"

/** Mount only with the account picker; each opening fetches fresh eligibility. */
export function useMessagingAccounts(botId: number) {
  return useQuery({
    queryKey: queryKeys.accounts.list({ botId, eligible: true, type: "Messaging" }),
    queryFn: ({ signal }) => EligibleAccountsService.getMessagingEligibleAccounts(botId, signal),
    refetchOnMount: "always",
  })
}
