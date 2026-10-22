import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { LeadsService } from "@/features/leads/services/LeadsService"

/** Remove only after acknowledgment; refresh lists without guessing new totals. */
export function useRemoveLead(botId: number) {
  const client = useQueryClient()
  const locked = useRef(false)
  const mutation = useMutation({
    mutationFn: LeadsService.removeLead,
    retry: false,
    gcTime: 0,
    onSettled: async (_data, error, leadId) => {
      if (!error) {
        const detailKey = queryKeys.leads.detail(leadId)
        // Cancel old reads before dropping every bot-scoped copy of this record.
        await client.cancelQueries({ queryKey: detailKey })
        client.removeQueries({ queryKey: detailKey })
      }
      // A failed response may follow an applied delete. Refresh lists and quota
      // either way, retaining the detail view and its error when removal fails.
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.leads.lists() }),
        client.invalidateQueries({ queryKey: queryKeys.leads.messagingPreview(botId) }),
      ])
    },
  })

  async function remove(leadId: number) {
    if (locked.current) throw normalizeApiError({ message: "A lead removal is already in progress." })
    locked.current = true
    try {
      await mutation.mutateAsync(leadId)
    } finally {
      locked.current = false
      mutation.reset()
    }
  }

  return { remove, isPending: mutation.isPending }
}
