import type { ZodType } from "zod"

import { normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"

/** Validate transport data without displaying payloads or schema diagnostics. */
export function readApiData<T>(payload: unknown, schema: ZodType<T>): T {
  if (!isApiResponse(payload)) throw normalizeApiError(payload)
  const parsed = schema.safeParse(payload.data)
  if (!parsed.success) throw normalizeApiError({ message: "The server returned an unsupported response." })
  return parsed.data
}
