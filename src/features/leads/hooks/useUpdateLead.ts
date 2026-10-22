import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { LeadsService } from "@/features/leads/services/LeadsService"
import type { UpdateLeadDto } from "@/features/leads/types/leads.types"

export function useUpdateLead(botId: number, leadId: number) {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (values: UpdateLeadDto) => LeadsService.updateLead(leadId, values),
    retry: false,
    gcTime: 0,
    onSuccess: async () => {
      // Discard reads started before the write and fetch authoritative details,
      // including metadata, rather than constructing a partial detail record.
      const queryKey = queryKeys.leads.detail(leadId)
      await client.cancelQueries({ queryKey })
      await client.invalidateQueries({ queryKey })
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.leads.lists() }),
        client.invalidateQueries({ queryKey: queryKeys.leads.messagingPreview(botId) }),
      ])
    },
  })

  async function update(values: UpdateLeadDto) {
    try {
      await mutation.mutateAsync(values)
    } finally {
      mutation.reset()
    }
  }

  return { update }
}
