import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { normalizeApiError, type NormalizedApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { LeadsService } from "@/features/leads/services/LeadsService"
import type { DispatchMessagingDto, DispatchMessagingResultDto } from "@/features/leads/types/leads.types"

/** Prevent duplicate jobs; neither status nor quota is changed optimistically. */
export function useDispatchMessages() {
  const client = useQueryClient()
  const locked = useRef(false)
  const mutation = useMutation<DispatchMessagingResultDto, NormalizedApiError, DispatchMessagingDto>({
    mutationFn: LeadsService.dispatchMessages,
    retry: false,
    gcTime: 0,
    onSettled: async () => {
      // A response can fail after a job was accepted. Reconcile both success
      // and failure, without assuming messages are already sent or retrying.
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.leads.all }),
        client.invalidateQueries({ queryKey: queryKeys.accounts.all }),
      ])
    },
  })

  async function dispatch(input: DispatchMessagingDto) {
    if (locked.current) throw normalizeApiError({ message: "A messaging request is already in progress." })
    locked.current = true
    try {
      return await mutation.mutateAsync(input)
    } finally {
      locked.current = false
      mutation.reset()
    }
  }

  return { dispatch, isPending: mutation.isPending }
}
