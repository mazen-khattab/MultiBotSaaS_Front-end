import { useQuery } from "@tanstack/react-query"

import { adminKeys } from "@/features/admin/shared/adminContracts"
import { useAdminWrite } from "@/features/admin/shared/useAdminWrite"
import { BotsService } from "./BotsService"
import type { AdminBotFilters, CreateAdminBot, UpdateAdminBot } from "./bots.types"

const keys = adminKeys("bots")
export function useAdminBots(filters: AdminBotFilters) {
  return useQuery({ queryKey: keys.list(filters), queryFn: ({ signal }) => BotsService.list(filters, signal) })
}
export function useAdminBot(id: number | null) {
  return useQuery({ queryKey: keys.detail(id), queryFn: ({ signal }) => BotsService.detail(id!, signal), enabled: id !== null, staleTime: 0, refetchOnMount: "always" })
}
/** Server acknowledgments determine success; no optimistic lifecycle changes. */
export function useAdminBotMutations() {
  const write = useAdminWrite()
  return { isPending: write.isPending,
    create: (input: CreateAdminBot) => write.run(() => BotsService.create(input)),
    update: (id: number, input: UpdateAdminBot) => write.run(() => BotsService.update(id, input)),
    setActive: (id: number, value: boolean) => write.run(() => BotsService.setActive(id, value)) }
}
