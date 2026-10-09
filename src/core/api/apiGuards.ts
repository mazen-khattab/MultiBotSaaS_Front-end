import type {
  ApiErrorResponse,
  ApiResponse,
  MessageOnlyErrorResponse,
  PaginatedResult,
} from "@/core/api/apiTypes"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isOptionalNullableString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string"

export const isApiResponse = <T = unknown>(value: unknown): value is ApiResponse<T> =>
  isRecord(value) &&
  value.isSuccess === true &&
  typeof value.message === "string" &&
  Number.isInteger(value.errorType) &&
  Object.hasOwn(value, "data")

export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  isRecord(value) &&
  value.isSuccess === false &&
  Number.isInteger(value.statusCode) &&
  typeof value.message === "string" &&
  typeof value.path === "string" &&
  typeof value.method === "string" &&
  typeof value.traceId === "string" &&
  isOptionalNullableString(value.details) &&
  isOptionalNullableString(value.innerException)

export const isMessageOnlyErrorResponse = (value: unknown): value is MessageOnlyErrorResponse =>
  isRecord(value) && Object.keys(value).length === 1 && typeof value.message === "string"

export const isPaginatedResult = <T = unknown>(value: unknown): value is PaginatedResult<T> =>
  isRecord(value) &&
  Array.isArray(value.items) &&
  Number.isInteger(value.totalItems) &&
  Number.isInteger(value.totalPages) &&
  Number.isInteger(value.currentPage)

