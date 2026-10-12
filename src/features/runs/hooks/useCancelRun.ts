import { useMutation, useQueryClient } from "@tanstack/react-query"

import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { RunsService } from "@/features/runs/services/RunsService"
import type { RunDto } from "@/features/runs/types/runs.types"

/** Do not invent EndedAt: refetch the server's final state after cancellation. */
export function useCancelRun() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (run: RunDto) => {
      if (run.status !== "Running" || run.endedAt !== null) {
        throw normalizeApiError({ message: "Only a running run can be cancelled." })
      }
      return RunsService.cancelRun(run.id)
    },
    retry: false,
    onSettled: async (_data, _error, run) => {
      // Refresh on rejection too: another worker may have finished the run.
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.runs.lists() }),
        client.invalidateQueries({ queryKey: queryKeys.runs.detail(run.id) }),
        client.invalidateQueries({ queryKey: queryKeys.accounts.all }),
      ])
    },
  })
}
