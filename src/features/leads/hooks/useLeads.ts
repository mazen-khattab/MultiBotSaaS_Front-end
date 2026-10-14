import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { LeadsService } from "@/features/leads/services/LeadsService"
import type { LeadsListParams } from "@/features/leads/types/leads.types"

/** Cache every server parameter; rows are never filtered or paged locally. */
export function useLeads(params: LeadsListParams) {
  return useQuery({
    queryKey: queryKeys.leads.list({ ...params }),
    queryFn: ({ signal }) => LeadsService.getLeads(params, signal),
  })
}
