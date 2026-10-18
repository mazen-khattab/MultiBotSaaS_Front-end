import { z } from "zod"

import { api } from "@/core/api/api"
import { readApiData } from "@/core/api/readApiData"

/** Part 14 needs eligibility only; full account management remains separate. */
export const connectedAccountSchema = z.object({
  id: z.number().int().positive(), displayName: z.string(), platform: z.string(),
  expiredAt: z.string(), isActive: z.boolean(),
})

export type ConnectedAccountDto = z.infer<typeof connectedAccountSchema>

/** Both existing consumers use the documented bot path. There is no query-only
 * alias; eligibility, expiry and ownership remain server responsibilities. */
async function getScrapingEligibleAccounts(botId: number, signal?: AbortSignal) {
  const response = await api.get<unknown>(`/api/v1/connectedaccounts/eligible/scraping/${botId}`, { signal })
  return readApiData(response.data, connectedAccountSchema.array())
}

async function getMessagingEligibleAccounts(botId: number, signal?: AbortSignal) {
  const response = await api.get<unknown>(`/api/v1/connectedaccounts/eligible/messaging/${botId}`, { signal })
  return readApiData(response.data, connectedAccountSchema.array())
}

export const EligibleAccountsService = {
  getScrapingEligibleAccounts: getScrapingEligibleAccounts,
  getMessagingEligibleAccounts: getMessagingEligibleAccounts,
}
