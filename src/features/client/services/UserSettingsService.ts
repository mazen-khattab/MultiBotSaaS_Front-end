import { isAxiosError } from "axios"
import { z } from "zod"

import { api } from "@/core/api/api"
import { getRawApiError, normalizeApiError, type NormalizedApiError } from "@/core/api/apiError"
import { readApiData } from "@/core/api/readApiData"
import { updateUserSettingsSchema, userSettingsSchema, type UpdateUserSettingsDto } from "@/features/client/types/client.types"

const endpoint = "/api/v1/settings"

export function canSaveUserSettings(): boolean {
  try { return new URL(api.getUri({ url: endpoint }), window.location.href).protocol === "https:" }
  catch { return false }
}

/** A validation/transport error can echo submitted keys. Retain no raw reference. */
function safeSaveError(error: unknown): NormalizedApiError {
  const normalized = normalizeApiError(error)
  const raw = getRawApiError(normalized)
  if (isAxiosError(raw) && raw.config) raw.config.data = undefined
  if ("statusCode" in normalized) {
    const messages: Record<number, string> = {
      400: "Settings were not saved. Review the daily limit and company information.",
      401: "Your session has ended. Sign in again before saving settings.",
      403: "Only a regular user can change these settings.",
      429: "Too many requests. Wait before saving settings again.",
    }
    return { kind: "api", statusCode: normalized.statusCode,
      message: messages[normalized.statusCode] ?? "Settings could not be saved. Refresh settings before trying again.",
      path: endpoint, method: "PUT", traceId: "" }
  }
  return { kind: normalized.kind === "network" ? "network" : "unknown",
    message: "Settings could not be saved. Check your connection and refresh settings before trying again." }
}

/** Cookie authentication and refresh remain in the shared API client. */
export const UserSettingsService = {
  async get(signal?: AbortSignal) {
    const response = await api.get<unknown>(endpoint, { signal })
    return readApiData(response.data, userSettingsSchema)
  },
  async update(input: UpdateUserSettingsDto): Promise<void> {
    if (!canSaveUserSettings()) throw normalizeApiError({ message: "An HTTPS API connection is required to save settings." })
    const parsed = updateUserSettingsSchema.safeParse(input)
    if (!parsed.success) throw normalizeApiError({ message: "Review the daily limit and company information before saving." })
    const dto = parsed.data
    // Blank replacements preserve saved credentials. Keep nonblank values as
    // supplied; GET masks are never copied into these request-only fields.
    if (!dto.aiApiKey?.trim()) delete dto.aiApiKey
    if (!dto.scraperToken?.trim()) delete dto.scraperToken
    try {
      const response = await api.put<unknown>(endpoint, dto)
      response.config.data = undefined
      // PUT acknowledges with the current user's GUID, never a settings object.
      readApiData(response.data, z.guid())
    } catch (error: unknown) {
      throw safeSaveError(error)
    } finally {
      delete dto.aiApiKey
      delete dto.scraperToken
    }
  },
}
