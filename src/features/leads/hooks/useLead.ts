import { useQuery } from "@tanstack/react-query"

import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { LeadsService } from "@/features/leads/services/LeadsService"
import { botIdSchema, leadIdSchema } from "@/features/leads/types/leads.schemas"

/** Keep detail caches separate from lists and reject records from another bot. */
export function useLead(botId: number, leadId: number) {
  return useQuery({
    queryKey: queryKeys.leads.detail(botId, leadId),
    enabled: botIdSchema.safeParse(botId).success && leadIdSchema.safeParse(leadId).success,
    queryFn: async ({ signal }) => {
      const lead = await LeadsService.getLead(leadId, signal)
      if (lead.botId !== botId) {
        throw normalizeApiError({ message: "This lead does not belong to the current bot workspace." })
      }
      return lead
    },
  })
}
