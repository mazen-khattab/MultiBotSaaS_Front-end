import { isAxiosError } from "axios"

import { isApiErrorResponse } from "@/core/api/apiGuards"
import { HTTP_STATUS } from "@/core/api/httpStatus"

export interface StructuredApiError {
  kind: "api"
  message: string
  statusCode: number
  path: string
  method: string
  traceId: string
  details?: string | null
  innerException?: string | null
}

export interface BareUnauthorizedError {
  kind: "unauthorized"
  message: string
  statusCode: 401
}

export interface SessionError {
  kind: "session"
  message: string
  statusCode: 401
}

export interface NetworkError {
  kind: "network"
  message: string
}

export interface UnknownError {
  kind: "unknown"
  message: string
  cause?: unknown
}

export type NormalizedApiError =
  | StructuredApiError
  | BareUnauthorizedError
  | SessionError
  | NetworkError
  | UnknownError

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired or ended because you logged in from another device."

const rawErrors = new WeakMap<NormalizedApiError, unknown>()
const normalizedErrors = new WeakMap<object, NormalizedApiError>()

const getPayloadMessage = (payload: unknown): string | undefined => {
  if (payload instanceof Error) return undefined
  if (typeof payload === "string" && payload.trim()) return payload
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    return typeof payload.message === "string" ? payload.message : undefined
  }
  return undefined
}

export const isSessionExpiredPayload = (payload: unknown): boolean =>
  getPayloadMessage(payload) === SESSION_EXPIRED_MESSAGE

// Raw transport errors may contain request bodies and headers. Keep them out of
// enumerable properties, JSON serialization, and the feature-facing message.
export const getRawApiError = (error: NormalizedApiError): unknown => rawErrors.get(error)

export const normalizeApiError = (rawError: unknown): NormalizedApiError => {
  if (typeof rawError === "object" && rawError !== null) {
    const normalized = normalizedErrors.get(rawError)
    if (normalized) return normalized
  }

  const transportError = isAxiosError<unknown>(rawError) ? rawError : undefined
  const payload: unknown = transportError ? transportError.response?.data : rawError
  const status = transportError?.response?.status
  const message = getPayloadMessage(payload)
  let normalized: NormalizedApiError

  if (isSessionExpiredPayload(payload) && (!transportError || status === HTTP_STATUS.UNAUTHORIZED)) {
    console.log("session expired detected")
    normalized = { kind: "session", message: SESSION_EXPIRED_MESSAGE, statusCode: 401 }
  } else if (isApiErrorResponse(payload)) {
    console.log("structured api error detected")
    normalized = {
      kind: "api",
      message: payload.message,
      statusCode: status ?? payload.statusCode,
      path: payload.path,
      method: payload.method,
      traceId: payload.traceId,
    }
    console.log("normalized api error", normalized)
  } else if (status === HTTP_STATUS.UNAUTHORIZED) {
    console.log("bare unauthorized error detected")
    normalized = { kind: "unauthorized", message: message || "Authentication required.", statusCode: 401 }
  } else if (transportError && !transportError.response &&
    (transportError.request || ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(transportError.code ?? ""))) {
    console.log("network error detected")
    normalized = { kind: "network", message: "Unable to reach the server. Please try again." }
  } else {
    normalized = { kind: "unknown", message: message || "The request could not be completed." }
  }

  rawErrors.set(normalized, rawError)
  normalizedErrors.set(normalized, normalized)
  return normalized
}

