import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/core/query/queryKeys"

import type { NormalizedApiError } from "@/core/api/apiError"
import { RunsService } from "@/features/runs/services/RunsService"
import type { CreateRunDto, CreateRunResult } from "@/features/runs/types/runs.types"

/** A write is never retried automatically: the backend has no idempotency key. */
export function useCreateRun() {
  const client = useQueryClient()
  return useMutation<CreateRunResult, NormalizedApiError, CreateRunDto>({
    mutationFn: RunsService.createRun,
    retry: false,
    // Retain no inactive request metadata and invent no history cache entries.
    gcTime: 0,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.runs.lists() }),
        client.invalidateQueries({ queryKey: queryKeys.accounts.all }),
      ])
    },
  })
}
