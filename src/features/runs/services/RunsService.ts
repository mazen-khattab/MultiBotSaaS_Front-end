import { api } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import type { CreateRunDto, CreateRunResult } from "@/features/runs/types/runs.types"

/** Cookie auth and error/refresh handling come from the shared API client. */
async function createRun(dto: CreateRunDto): Promise<CreateRunResult> {
  try {
    const response = await api.post<unknown>("/api/v1/runs", dto)
    if (!isApiResponse(response.data)) throw normalizeApiError(response.data)
    const runId = response.data.data
    if (typeof runId !== "number" || !Number.isInteger(runId) || runId <= 0 || runId > 2_147_483_647) {
      throw { message: "The server did not return a valid run ID. Check the run before submitting again." }
    }
    return runId
  } catch (error: unknown) {
    throw normalizeApiError(error)
  }
}

// There are no list/detail/cancel/retry endpoints in the current contract.
export const RunsService = { createRun }
