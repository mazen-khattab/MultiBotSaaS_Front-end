import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { GroupsService } from "@/features/groups/services/GroupsService"

/** All workspaces share the user's unfiltered group list and cache entry. */
export function useGroups() {
  return useQuery({ queryKey: queryKeys.groups.list(), queryFn: ({ signal }) => GroupsService.getAll(signal) })
}
