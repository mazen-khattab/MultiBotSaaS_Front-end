import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/core/query/queryKeys";
import { ConnectedAccountsService } from "@/features/connected-accounts/services/ConnectedAccountsService";

/** Every workspace observes the same user-owned list, with no guessed bot filter. */
export function useConnectedAccounts({ botId }: { botId: number }) {
  return useQuery({
    queryKey: queryKeys.accounts.list({ botId }),
    queryFn: ({ signal }) => ConnectedAccountsService.getAll(botId, signal),
  });
}
