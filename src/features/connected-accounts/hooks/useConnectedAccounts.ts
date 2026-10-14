import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/query/queryKeys";
import { ConnectedAccountsService } from "@/features/connected-accounts/services/ConnectedAccountsService";

/** Keep each bot's server-scoped account list in its own cache entry. */
export function useConnectedAccounts({ botId }: { botId: number }) {
  return useQuery({
    queryKey: queryKeys.accounts.list({ botId }),
    queryFn: ({ signal }) => ConnectedAccountsService.getAll(botId, signal),
  });
}
