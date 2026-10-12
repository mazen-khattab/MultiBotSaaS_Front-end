import { api } from "@/core/api/api"
import { readApiData } from "@/core/api/readApiData"
import { botSchema } from "@/features/bots/types/bots.types"

/** Use cookie-authenticated catalog endpoints and forward query cancellation. */
export const BotsService = {
  async getBots(signal?: AbortSignal) {
    const response = await api.get<unknown>("/api/v1/bots", { signal })
    return readApiData(response.data, botSchema.array())
  },
  async getSubscribedBots(signal?: AbortSignal) {
    const response = await api.get<unknown>("/api/v1/bots/subscribed", { signal })
    return readApiData(response.data, botSchema.array())
  },
  async getBot(id: number, requireOwnership = false, signal?: AbortSignal) {
    const response = await api.get<unknown>(`/api/v1/bots/${id}`, { params: { requireOwnership }, signal })
    return readApiData(response.data, botSchema)
  },
}
