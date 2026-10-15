import { z } from "zod"

import { api } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { readApiData } from "@/core/api/readApiData"
import { adminIdSchema, adminPageSchema, parseAdminInput } from "@/features/admin/shared/adminContracts"
import { adminSubscriptionFiltersSchema, adminSubscriptionSchema, assignAdminSubscriptionSchema,
  type AdminSubscriptionFilters, type AssignAdminSubscription } from "./subscriptions.types"

const endpoint = "/api/v1/admin/subscriptions"
const path = (id: number) => `${endpoint}/${parseAdminInput(adminIdSchema, id)}`

/** Only relationship assignment/removal is exposed; this service cannot bill. */
export const SubscriptionsService = {
  async list(filters: AdminSubscriptionFilters = {}, signal?: AbortSignal) {
    const response = await api.get<unknown>(endpoint, { params: parseAdminInput(adminSubscriptionFiltersSchema, filters), signal })
    return readApiData(response.data, adminPageSchema(adminSubscriptionSchema))
  },
  async detail(id: number, signal?: AbortSignal) {
    const response = await api.get<unknown>(path(id), { signal })
    const assignment = readApiData(response.data, adminSubscriptionSchema)
    if (assignment.id !== id) throw normalizeApiError({ message: "The server returned a different assignment." })
    return assignment
  },
  async assign(input: AssignAdminSubscription) {
    const response = await api.post<unknown>(endpoint, parseAdminInput(assignAdminSubscriptionSchema, input))
    return readApiData(response.data, adminSubscriptionSchema)
  },
  async remove(id: number): Promise<void> {
    const response = await api.delete<unknown>(path(id))
    readApiData(response.data, z.literal(true))
  },
}
