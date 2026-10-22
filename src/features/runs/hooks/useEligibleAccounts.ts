import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { EligibleAccountsService } from "@/features/runs/services/EligibleAccountsService"

/** No client eligibility filtering; an empty successful response disables start. */
export function useEligibleAccounts(botId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accounts.list({ botId, eligible: true, type: "Scraping" }),
    queryFn: ({ signal }) => EligibleAccountsService.getScrapingEligibleAccounts(botId, signal),
    enabled: enabled && Number.isInteger(botId) && botId > 0,
    refetchOnMount: "always",
  })
}
