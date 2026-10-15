import { useQuery, useQueryClient } from "@tanstack/react-query"

import { adminKeys } from "@/features/admin/shared/adminContracts"
import { useAdminWrite } from "@/features/admin/shared/useAdminWrite"
import { SubscriptionsService } from "./SubscriptionsService"
import type { AdminSubscriptionFilters, AssignAdminSubscription } from "./subscriptions.types"

const keys = adminKeys("subscriptions")
export function useAdminSubscriptions(filters: AdminSubscriptionFilters) {
  return useQuery({ queryKey: keys.list(filters), queryFn: ({ signal }) => SubscriptionsService.list(filters, signal) })
}
export function useAdminSubscription(id: number | null) {
  return useQuery({ queryKey: keys.detail(id), queryFn: ({ signal }) => SubscriptionsService.detail(id!, signal), enabled: id !== null, staleTime: 0, refetchOnMount: "always" })
}
/** Removal uses the assignment ID, never its related user ID or bot ID. */
export function useAdminSubscriptionMutations() {
  const client = useQueryClient()
  const write = useAdminWrite()
  return { isPending: write.isPending,
    assign: (input: AssignAdminSubscription) => write.run(() => SubscriptionsService.assign(input)),
    remove: (id: number) => write.run(async () => {
      await SubscriptionsService.remove(id)
      client.removeQueries({ queryKey: keys.detail(id), exact: true })
    }) }
}
