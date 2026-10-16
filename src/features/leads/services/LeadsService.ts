import { api } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { readApiData } from "@/core/api/readApiData"
import { botIdSchema, dispatchMessagingResultSchema, dispatchMessagingSchema, leadsPageSchema, messagingPreviewSchema } from "@/features/leads/types/leads.schemas"
import type { DispatchMessagingDto, LeadsListParams } from "@/features/leads/types/leads.types"

/** Use the canonical V2 route for both list and messaging-preview reads. */
const leadsEndpoint = "/api/v1/leads"

function requireBotId(botId: number) {
  if (!botIdSchema.safeParse(botId).success) {
    throw normalizeApiError({ message: "Select a valid bot before loading leads." })
  }
}

/** Reads use cookie auth, coordinated refresh, and Query's cancellation signal. */
export const LeadsService = {
  async getLeads({ botId, pageNumber, pageSize, statusFilter }: LeadsListParams, signal?: AbortSignal) {
    requireBotId(botId)
    const response = await api.get<unknown>(`${leadsEndpoint}/leads/${botId}`, {
      params: { pageNumber, pageSize, ...(statusFilter ? { statusFilter } : {}) },
      signal,
    })
    return readApiData(response.data, leadsPageSchema)
  },
  async getMessagingPreview(botId: number, signal?: AbortSignal) {
    requireBotId(botId)
    const response = await api.get<unknown>(`${leadsEndpoint}/bot/messaging-preview/${botId}`, { signal })
    return readApiData(response.data, messagingPreviewSchema)
  },
  async dispatchMessages(input: DispatchMessagingDto) {
    const parsed = dispatchMessagingSchema.safeParse(input)
    if (!parsed.success) {
      throw normalizeApiError({ message: "Choose an eligible account and available leads before sending." })
    }
    // This endpoint is explicitly user-initiated. No worker API key, callback,
    // status update, or webhook operation is exposed by this feature.
    const response = await api.post<unknown>("/api/v1/worker/dispatch-messaging", parsed.data)
    return readApiData(response.data, dispatchMessagingResultSchema)
  },
}
