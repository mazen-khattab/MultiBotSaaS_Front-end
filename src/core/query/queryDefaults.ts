import type { DefaultOptions } from "@tanstack/react-query"
import { isAxiosError, isCancel } from "axios"
import { env } from "@/core/config/env"

import { getRawApiError, normalizeApiError } from "@/core/api/apiError"

const getHttpStatus = (error: unknown): number | undefined => {
  if (isAxiosError(error)) return error.response?.status
  if (typeof error === "object" && error !== null && "statusCode" in error &&
    typeof error.statusCode === "number" && Number.isInteger(error.statusCode)) {
    return error.statusCode
  }
  return undefined
}

export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  // TanStack counts the first failure as zero: two retries mean three attempts.
  if (failureCount >= env.maxQueryRetries) return false

  const normalized = normalizeApiError(error)
  const original = getRawApiError(normalized) ?? error

  // Cancellation is deliberate, even if the transport normalizes it as network.
  if (isCancel(original)) return false

  // Bare 5xx responses normalize to "unknown". The original HTTP status still
  // lets us retry them without exposing the raw response or request to the UI.
  const status = getHttpStatus(original) ?? getHttpStatus(error)
  if (status !== undefined) return status >= 500 && status < 600

  // Also accept the public NetworkError shape when supplied without a WeakMap
  // entry, e.g. an error passed through a feature's own typed service boundary.
  return normalized.kind === "network" ||
    (typeof error === "object" && error !== null && "kind" in error && error.kind === "network" &&
      "message" in error && typeof error.message === "string")
}

export const queryDefaults = {
  queries: {
    retry: shouldRetryQuery,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
    refetchOnWindowFocus: false,
    throwOnError: false,
    // Keep TanStack's staleTime default; each feature will choose its own later.
  },
  mutations: {
    // The backend has no idempotency-key contract. Retrying a write could apply
    // it twice, so retries remain an explicit decision for individual features.
    retry: false,
    throwOnError: false,
  },
} satisfies DefaultOptions
