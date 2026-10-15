import { isAxiosError } from "axios"

import { api } from "@/core/api/api"
import { getRawApiError, normalizeApiError } from "@/core/api/apiError"
import { readApiData } from "@/core/api/readApiData"
import { adminGuidSchema, adminPageSchema, parseAdminInput } from "@/features/admin/shared/adminContracts"
import { adminUserFiltersSchema, adminUserSchema, createAdminUserSchema, updateAdminUserSchema,
  type AdminUserFilters, type CreateAdminUser, type UpdateAdminUser } from "./users.types"

const endpoint = "/api/v1/admin/users"
const path = (id: string) => `${endpoint}/${parseAdminInput(adminGuidSchema, id)}`

/** Manage regular users with admin cookies; account roles are never writable. */
export const UsersService = {
  async list(filters: AdminUserFilters = {}, signal?: AbortSignal) {
    const response = await api.get<unknown>(endpoint, { params: parseAdminInput(adminUserFiltersSchema, filters), signal })
    return readApiData(response.data, adminPageSchema(adminUserSchema))
  },
  async detail(id: string, signal?: AbortSignal) {
    const response = await api.get<unknown>(path(id), { signal })
    const user = readApiData(response.data, adminUserSchema)
    if (user.id !== id) throw normalizeApiError({ message: "The server returned a different user." })
    return user
  },
  async create(input: CreateAdminUser) {
    const dto = parseAdminInput(createAdminUserSchema, input)
    try {
      const response = await api.post<unknown>(endpoint, dto)
      response.config.data = undefined
      return readApiData(response.data, adminUserSchema)
    } catch (error: unknown) {
      // A failed create can echo its password. Remove the request body and keep
      // only a safe message; the password must never enter query/mutation state.
      const normalized = normalizeApiError(error)
      const raw = getRawApiError(normalized)
      if (isAxiosError(raw) && raw.config) raw.config.data = undefined
      const statusCode = "statusCode" in normalized ? normalized.statusCode : 0
      throw normalizeApiError({ message: statusCode === 409 ? "Email is already in use." : "User could not be created. Review the fields and try again." })
    } finally { dto.password = "" }
  },
  async update(id: string, input: UpdateAdminUser) {
    const response = await api.put<unknown>(path(id), parseAdminInput(updateAdminUserSchema, input))
    return readApiData(response.data, adminUserSchema)
  },
  async setDeactivated(id: string, deactivated: boolean) {
    const response = await api.put<unknown>(`${path(id)}/${deactivated ? "deactivate" : "reactivate"}`)
    return readApiData(response.data, adminUserSchema)
  },
}
