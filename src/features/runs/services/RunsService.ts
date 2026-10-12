import { api } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import { readApiData } from "@/core/api/readApiData"
import { z } from "zod"
import { runSchema, runsPageSchema } from "@/features/runs/types/runs.schemas"
import type { CreateRunDto, CreateRunResult, RunsListParams } from "@/features/runs/types/runs.types"

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

/** All reads are user-scoped by the backend; no retry API is defined. */
export const RunsService = {
  createRun,
  async getRuns(params: RunsListParams = {}, signal?: AbortSignal) {
    const response = await api.get<unknown>("/api/v1/runs", { params, signal })
    return readApiData(response.data, runsPageSchema)
  },
  async getRun(id: number, signal?: AbortSignal) {
    const response = await api.get<unknown>(`/api/v1/runs/${id}`, { signal })
    const run = readApiData(response.data, runSchema)
    if (run.id !== id) throw normalizeApiError({ message: "The server returned a different run." })
    return run
  },
  async cancelRun(id: number): Promise<void> {
    const response = await api.post<unknown>(`/api/v1/runs/${id}/cancel`)
    readApiData(response.data, z.literal(true))
  },
}
