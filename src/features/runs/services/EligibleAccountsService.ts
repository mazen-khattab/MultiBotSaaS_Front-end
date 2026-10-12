import { z } from "zod"

import { api } from "@/core/api/api"
import { readApiData } from "@/core/api/readApiData"

/** Part 14 needs eligibility only; full account management remains separate. */
export const connectedAccountSchema = z.object({
  id: z.number().int().positive(), displayName: z.string(), platform: z.string(),
  expiredAt: z.string(), isActive: z.boolean(),
})
export type ConnectedAccountDto = z.infer<typeof connectedAccountSchema>

export const EligibleAccountsService = {
  async getEligibleAccounts(botId: number, signal?: AbortSignal) {
    // Use one canonical route. Eligibility, expiry, and ownership are server rules.
    const response = await api.get<unknown>("/api/v1/connectedaccounts/eligible", { params: { botId }, signal })
    return readApiData(response.data, connectedAccountSchema.array())
  },
}
