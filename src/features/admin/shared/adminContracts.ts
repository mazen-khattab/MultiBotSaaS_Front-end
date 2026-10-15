import { z } from "zod"

import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys, type QueryKeyFilters } from "@/core/query/queryKeys"

export const adminIdSchema = z.number().int().positive().max(2_147_483_647)
export const adminGuidSchema = z.guid().refine((id) => id !== "00000000-0000-0000-0000-000000000000")
export const adminPageFilters = z.object({
  pageNumber: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
})

/** Keep pagination metadata from the server; a page length is never a total. */
export function adminPageSchema<T>(item: z.ZodType<T>) {
  return z.object({ items: item.array(), totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(), currentPage: z.number().int().positive() })
}

/** Reject unsupported write fields before sending them to strict admin DTOs. */
export function parseAdminInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw normalizeApiError({ message: "Review the management request fields and try again." })
  return parsed.data
}

/** All admin data stays under the existing session-owned cache prefix. */
export function adminKeys(area: "users" | "bots" | "subscriptions") {
  const all = [...queryKeys.admin.all, area] as const
  return { all, list: (filters: QueryKeyFilters) => [...all, "list", filters] as const,
    detail: (id: string | number | null) => [...all, "detail", id] as const }
}
