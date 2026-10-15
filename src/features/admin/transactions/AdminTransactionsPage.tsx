import { frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import { AdminPage, AdminUnavailable } from "@/features/admin/shared/AdminPage"

/** No transaction DTO is inferred from the internal backend entity. */
export default function AdminTransactionsPage() {
  return <AdminPage title="Transactions" description="Administrative transaction reporting boundary.">
    <AdminUnavailable capability={frontendCapabilities.adminTransactions} />
  </AdminPage>
}
