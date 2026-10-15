import { api } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { readApiData } from "@/core/api/readApiData"
import { adminIdSchema, adminPageSchema, parseAdminInput } from "@/features/admin/shared/adminContracts"
import { adminBotFiltersSchema, adminBotSchema, createAdminBotSchema, updateAdminBotSchema,
  type AdminBotFilters, type CreateAdminBot, type UpdateAdminBot } from "./bots.types"

const endpoint = "/api/v1/admin/bots"
const path = (id: number) => `${endpoint}/${parseAdminInput(adminIdSchema, id)}`

/** Admin metadata and lifecycle writes are distinct from client catalog reads. */
export const BotsService = {
  async list(filters: AdminBotFilters = {}, signal?: AbortSignal) {
    const response = await api.get<unknown>(endpoint, { params: parseAdminInput(adminBotFiltersSchema, filters), signal })
    return readApiData(response.data, adminPageSchema(adminBotSchema))
  },
  async detail(id: number, signal?: AbortSignal) {
    const response = await api.get<unknown>(path(id), { signal })
    const bot = readApiData(response.data, adminBotSchema)
    if (bot.id !== id) throw normalizeApiError({ message: "The server returned a different bot." })
    return bot
  },
  async create(input: CreateAdminBot) {
    const response = await api.post<unknown>(endpoint, parseAdminInput(createAdminBotSchema, input))
    return readApiData(response.data, adminBotSchema)
  },
  async update(id: number, input: UpdateAdminBot) {
    const response = await api.put<unknown>(path(id), parseAdminInput(updateAdminBotSchema, input))
    return readApiData(response.data, adminBotSchema)
  },
  async setActive(id: number, active: boolean) {
    const response = await api.put<unknown>(`${path(id)}/${active ? "activate" : "deactivate"}`)
    return readApiData(response.data, adminBotSchema)
  },
}
