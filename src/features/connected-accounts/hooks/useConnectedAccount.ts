import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { ConnectedAccountsService } from "@/features/connected-accounts/services/ConnectedAccountsService"

/** Detail responses contain masked cookies only and load when a row is opened. */
export function useConnectedAccount(botId: number, id: number | null) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(botId, id ?? "unselected"),
    queryFn: ({ signal }) => ConnectedAccountsService.getById(botId, id!, signal), enabled: id !== null,
  })
}
