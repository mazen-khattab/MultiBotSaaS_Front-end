import { AdminPage, AdminUnavailable } from "@/features/admin/shared/AdminPage"

/** User activity logs cannot substitute for a platform-wide Admin audit API. */
export default function AdminAuditLogsPage() {
  return <AdminPage title="Audit logs" description="Administrative audit reporting boundary.">
    <AdminUnavailable>No Admin audit-log read API exists. The regular-user activity-log endpoint cannot provide administrative audit logs.</AdminUnavailable>
  </AdminPage>
}
