import { z } from "zod"

import { adminGuidSchema, adminPageFilters } from "@/features/admin/shared/adminContracts"

// Response allowlisting strips accidental internal fields before caching.
export const adminUserSchema = z.object({ id: adminGuidSchema, fullName: z.string(), email: z.string(),
  phoneNumber: z.string(), isDeleted: z.boolean(), createdAt: z.string() })
const profile = { fullName: z.string().trim().min(1, "Enter a full name.").max(100),
  email: z.email().max(255), phoneNumber: z.string() }
export const createAdminUserSchema = z.strictObject({ ...profile, phoneNumber: z.string().default(""),
  password: z.string().refine((value) => value.trim().length > 0, "Enter an initial password.") })
export const updateAdminUserSchema = z.strictObject(profile)
export const adminUserFiltersSchema = adminPageFilters.extend({ search: z.string().max(255).optional(), isDeleted: z.boolean().optional() }).strict()
export type AdminUser = z.infer<typeof adminUserSchema>
export type CreateAdminUser = z.input<typeof createAdminUserSchema>
export type UpdateAdminUser = z.infer<typeof updateAdminUserSchema>
export type AdminUserFilters = z.input<typeof adminUserFiltersSchema>
