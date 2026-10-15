import { useQuery } from "@tanstack/react-query"

import { adminKeys } from "@/features/admin/shared/adminContracts"
import { useAdminWrite } from "@/features/admin/shared/useAdminWrite"
import { UsersService } from "./UsersService"
import type { AdminUserFilters, CreateAdminUser, UpdateAdminUser } from "./users.types"

const keys = adminKeys("users")
export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({ queryKey: keys.list(filters), queryFn: ({ signal }) => UsersService.list(filters, signal) })
}
export function useAdminUser(id: string | null) {
  return useQuery({ queryKey: keys.detail(id), queryFn: ({ signal }) => UsersService.detail(id!, signal), enabled: id !== null, staleTime: 0, refetchOnMount: "always" })
}
/** Passwords pass through a private operation, never React Query variables. */
export function useAdminUserMutations() {
  const write = useAdminWrite()
  return { isPending: write.isPending,
    create: (input: CreateAdminUser) => write.run(() => UsersService.create(input)),
    update: (id: string, input: UpdateAdminUser) => write.run(() => UsersService.update(id, input)),
    setDeactivated: (id: string, value: boolean) => write.run(() => UsersService.setDeactivated(id, value)) }
}
