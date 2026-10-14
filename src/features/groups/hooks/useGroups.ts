import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { GroupsService } from "@/features/groups/services/GroupsService"

/** Bot-scoped reads use separate cache entries for each workspace. */
export function useGroups(botId: number) {
  return useQuery({ queryKey: queryKeys.groups.list({ botId }), queryFn: ({ signal }) => GroupsService.getAll(botId, signal) })
}
