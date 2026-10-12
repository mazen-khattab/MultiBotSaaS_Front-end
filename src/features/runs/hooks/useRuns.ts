import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/core/query/queryKeys"
import { RunsService } from "@/features/runs/services/RunsService"
import type { RunsListParams } from "@/features/runs/types/runs.types"

/** Include every server filter in the key; the table never filters local rows. */
export function useRuns(params: RunsListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.runs.list({ ...params }),
    queryFn: ({ signal }) => RunsService.getRuns(params, signal), enabled,
  })
}

export function useRun(id: number | null) {
  return useQuery({
    queryKey: queryKeys.runs.detail(id ?? "unselected"),
    queryFn: ({ signal }) => RunsService.getRun(id!, signal), enabled: id !== null,
  })
}
