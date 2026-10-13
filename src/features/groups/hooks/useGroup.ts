import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { GroupsService } from "@/features/groups/services/GroupsService"

/** Details load on demand; the create dialog has no existing group to fetch. */
export function useGroup(id: number | null) {
  return useQuery({
    queryKey: queryKeys.groups.detail(id ?? "unselected"),
    queryFn: ({ signal }) => GroupsService.getById(id!, signal),
    enabled: id !== null,
  })
}
