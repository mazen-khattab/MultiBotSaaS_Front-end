import { api } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import { readApiData } from "@/core/api/readApiData"
import { botIdSchema, dispatchMessagingResultSchema, dispatchMessagingSchema, leadDetailsSchema, leadIdSchema, leadsPageSchema, messagingPreviewSchema, updateLeadSchema } from "@/features/leads/types/leads.schemas"
import type { DispatchMessagingDto, LeadDetailsDto, LeadsListParams, UpdateLeadDto } from "@/features/leads/types/leads.types"

/** Use the canonical V2 route for both list and messaging-preview reads. */
const leadsEndpoint = "/api/v1/leads"

function requireBotId(botId: number) {
  if (!botIdSchema.safeParse(botId).success) {
    throw normalizeApiError({ message: "Select a valid bot before loading leads." })
  }
}

/** Reads use cookie auth, coordinated refresh, and Query's cancellation signal. */
export const LeadsService = {
  async updateLead(leadId: number, input: UpdateLeadDto): Promise<void> {
    if (!leadIdSchema.safeParse(leadId).success) {
      throw normalizeApiError({ message: "Select a valid lead before updating it." })
    }
    const parsed = updateLeadSchema.safeParse(input)
    if (!parsed.success) {
      throw normalizeApiError({ message: "Enter a profile name, profile URL, AI message, and status as text." })
    }
    // Use the parsed allowlist, never the caller's object or the full detail DTO.
    const response = await api.put<unknown>(`/api/v1/Leads/UpdateLead/${leadId}`, parsed.data)
    if (response.status === 204) return
    if (!isApiResponse(response.data)) throw normalizeApiError(response.data)
    if (response.data.data === false) throw normalizeApiError({ message: "The lead could not be updated." })
  },
  async removeLead(leadId: number): Promise<void> {
    if (!leadIdSchema.safeParse(leadId).success) {
      throw normalizeApiError({ message: "Select a valid lead before removing it." })
    }
    const response = await api.delete<unknown>(`/api/v1/Leads/RemoveLead/${leadId}`)
    // The endpoint's data shape is unspecified. Honor the app's success envelope
    // or an empty HTTP 204, without inventing a returned lead ID or object.
    if (response.status === 204) return
    if (!isApiResponse(response.data)) throw normalizeApiError(response.data)
    if (response.data.data === false) throw normalizeApiError({ message: "The lead could not be removed." })
  },
  async getLead(leadId: number, signal?: AbortSignal): Promise<LeadDetailsDto> {
    if (!leadIdSchema.safeParse(leadId).success) {
      throw normalizeApiError({ message: "Select a valid lead before loading details." })
    }
    const response = await api.get<unknown>(`/api/v1/Leads/${leadId}`, { signal })
    const lead = readApiData(response.data, leadDetailsSchema)
    if (lead.id !== leadId) throw normalizeApiError({ message: "The server returned a different lead." })
    return lead
  },
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
