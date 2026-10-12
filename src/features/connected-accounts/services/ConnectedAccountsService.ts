import { isAxiosError } from "axios"
import { z } from "zod"

import { api } from "@/core/api/api"
import { getRawApiError, normalizeApiError, type NormalizedApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import { readApiData } from "@/core/api/readApiData"
import { connectedAccountDetailSchema, connectedAccountListSchema, toCreateConnectedAccountDto, toUpdateConnectedAccountDto } from "@/features/connected-accounts/adapters/connectedAccountAdapter"
import type { CreateConnectedAccountInput, UpdateConnectedAccountInput } from "@/features/connected-accounts/types/connectedAccounts.types"

const endpoint = "/api/v1/connectedaccounts"

/** Resolve relative API URLs against the page origin before allowing secrets. */
export function canSendAccountCookies(): boolean {
  try {
    return new URL(api.getUri({ url: endpoint }), window.location.href).protocol === "https:"
  } catch {
    return false
  }
}

function requireHttps() {
  if (!canSendAccountCookies()) throw normalizeApiError({ message: "Configure an HTTPS API URL before submitting account cookies." })
}

/** Error messages may echo submitted input. Publish only fixed, safe messages. */
function safeWriteError(error: unknown): NormalizedApiError {
  const normalized = normalizeApiError(error)
  const raw = getRawApiError(normalized)
  if (isAxiosError(raw) && raw.config) raw.config.data = undefined
  if ("statusCode" in normalized) {
    const messages: Record<number, string> = {
      400: "The account was not saved. Review the name, platform, and cookie payload.",
      401: "Your session has ended. Sign in again before saving the account.",
      403: "You do not have permission to change this account.",
      404: "The account or bot was not found or is unavailable to your user.",
      409: "The account could not be changed because of a conflict. Refresh and try again.",
      429: "Too many requests. Wait before trying again.",
    }
    // Do not preserve path, trace, cause, or a raw transport reference here.
    return { kind: "api", statusCode: normalized.statusCode, message: messages[normalized.statusCode] ?? "The account could not be changed. Try again later.", path: endpoint, method: "", traceId: "" }
  }
  return { kind: normalized.kind === "network" ? "network" : "unknown", message: "The account request could not be completed. Check your connection and account list before trying again." }
}

/** The contract does not specify create/update data. Refetch instead of guessing. */
async function save(method: "post" | "put", url: string, dto: ReturnType<typeof toCreateConnectedAccountDto> | ReturnType<typeof toUpdateConnectedAccountDto>) {
  try {
    requireHttps()
    const response = await api[method]<unknown>(url, dto)
    // Axios has already serialized the body; discard that retained copy as well.
    response.config.data = undefined
    if (!isApiResponse(response.data)) throw normalizeApiError(response.data)
  } catch (error: unknown) {
    throw safeWriteError(error)
  } finally {
    dto.cookiesPayload = ""
  }
}

/** Reuse cookie authentication, refresh coordination, and abortable reads. */
export const ConnectedAccountsService = {
  create(input: CreateConnectedAccountInput): Promise<void> {
    requireHttps()
    return save("post", endpoint, toCreateConnectedAccountDto(input))
  },
  async getAll(botId: number, signal?: AbortSignal) {
    // There is no botId filter contract. This is the user's shared account list.
    const response = await api.get<unknown>(`${endpoint}/${botId}`, { signal })
    return readApiData(response.data, connectedAccountListSchema.array())
  },
  async getById(botId: number, id: number, signal?: AbortSignal) {
    const response = await api.get<unknown>(`${endpoint}/${botId}/${id}`, { signal })
    const account = readApiData(response.data, connectedAccountDetailSchema)
    if (account.id !== id) throw normalizeApiError({ message: "The server returned a different connected account." })
    return account
  },
  update(id: number, input: UpdateConnectedAccountInput): Promise<void> {
    requireHttps()
    return save("put", `${endpoint}/${id}`, toUpdateConnectedAccountDto(input))
  },
  async delete(id: number): Promise<void> {
    try {
      const response = await api.delete<unknown>(`${endpoint}/${id}`)
      readApiData(response.data, z.literal(true))
    } catch (error: unknown) {
      throw safeWriteError(error)
    }
  },
}
