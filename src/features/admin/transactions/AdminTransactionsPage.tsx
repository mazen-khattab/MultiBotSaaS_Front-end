import { AdminPage, AdminUnavailable } from "@/features/admin/shared/AdminPage"

/** No transaction DTO is inferred from the internal backend entity. */
export default function AdminTransactionsPage() {
  return <AdminPage title="Transactions" description="Administrative transaction reporting boundary.">
    <AdminUnavailable>No Admin transaction API or response DTO exists. Commercial plans, billing and payment operations are unavailable.</AdminUnavailable>
  </AdminPage>
}
