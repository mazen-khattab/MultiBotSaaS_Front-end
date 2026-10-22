import { useState } from "react"

import { AdminPage } from "@/features/admin/shared/AdminPage"
import { AdminDetails, AdminRecordDialog, type AdminSelection } from "@/features/admin/shared/AdminRecordDialog"
import { DataTable } from "@/shared/components/data-table/DataTable"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { Button } from "@/shared/ui/button"
import { AssignmentFilters } from "./AssignmentFilters"
import { AssignmentForm } from "./AssignmentForm"
import type { AdminSubscriptionFilters } from "./subscriptions.types"
import { useAdminSubscription, useAdminSubscriptionMutations, useAdminSubscriptions } from "./useAdminSubscriptions"

/** Removal revokes a relationship; there is no recoverable inactive record. */
function AssignmentDialog({ selection, onClose, onSaved }: {
  readonly selection: AdminSelection<number>
  readonly onClose: () => void
  readonly onSaved: (notice: string) => void
}) {
  const creating = selection.mode === "create"
  const detail = useAdminSubscription(creating ? null : selection.id)
  const mutation = useAdminSubscriptionMutations()
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const ready = detail.isFetchedAfterMount && !detail.error && detail.data
  const assignment = ready ? detail.data : undefined
  return <AdminRecordDialog title={creating ? "Assign bot" : selection.mode === "status" ? "Remove assignment" : "Assignment details"}
    description="UserBot assignments grant access. Assigning creates no payment or transaction."
    busy={saving || mutation.isPending} loading={!creating && !ready && !detail.error} error={creating ? null : detail.error}
    onRetry={() => { void detail.refetch() }} onClose={onClose}>
    {creating ? <AssignmentForm onSubmittingChange={setSaving} onSaved={() => onSaved("Bot assigned.")} /> : null}
    {selection.mode === "view" && assignment ? <AdminDetails fields={{ "Assignment ID": assignment.id, "User ID": assignment.userId,
      User: assignment.userFullName, Email: assignment.userEmail, "Bot ID": assignment.botId, Bot: assignment.botName,
      "UI module code": assignment.uiModuleCode, "Legacy purchase price": assignment.purchasePrice,
      "Assignment / legacy purchase date": assignment.purchaseDate, "Assignment present": assignment.isActive }} /> : null}
    {selection.mode === "status" && assignment ? <div className="space-y-4">
      <p>Remove {assignment.botName} from {assignment.userFullName}? Access is revoked by deleting assignment {assignment.id}.
        Related user and bot data are retained. Reassigning creates a new relationship.</p>
      <ApiErrorAlert error={failure} />
      <Button variant="destructive" disabled={mutation.isPending} onClick={() => {
        setFailure(null)
        void mutation.remove(assignment.id).then(() => onSaved("Assignment removed."), setFailure)
      }}>Confirm removal</Button>
    </div> : null}
  </AdminRecordDialog>
}

/** The existing subscriptions route represents access assignments, not billing. */
export default function AdminSubscriptionsPage() {
  const [filters, setFilters] = useState<AdminSubscriptionFilters>({ pageNumber: 1, pageSize: 10 })
  const assignments = useAdminSubscriptions(filters)
  const [selection, setSelection] = useState<AdminSelection<number> | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const choose = (value: AdminSelection<number>) => { setNotice(null); setSelection(value) }
  return <AdminPage title="Subscriptions" description="Manage UserBot access assignments. Commercial plans, recurring billing and payments are unavailable.">
    <Button onClick={() => choose({ mode: "create" })}>Assign bot</Button>
    <AssignmentFilters onApply={(next) => setFilters({ ...next, pageSize: filters.pageSize })} />
    <p className="text-sm text-muted-foreground">Existing rows grant access independently of user or bot lifecycle status. Removed assignments have no inactive history.</p>
    {notice ? <p role="status">{notice}</p> : null}
    <DataTable caption="UserBot assignments" data={assignments.data?.items ?? []} getRowId={(assignment) => String(assignment.id)}
      onRowClick={(assignment) => choose({ mode: "view", id: assignment.id })}
      isLoading={assignments.isPending} isFetching={assignments.isFetching} error={assignments.error} onRetry={() => { void assignments.refetch() }}
      columns={[
        { key: "id", header: "Assignment ID", accessorKey: "id" }, { key: "user", header: "User", accessorKey: "userFullName" },
        { key: "email", header: "Email", accessorKey: "userEmail" }, { key: "bot", header: "Bot", accessorKey: "botName" },
        { key: "date", header: "Assignment / legacy purchase date", accessorKey: "purchaseDate" },
        { key: "actions", header: "Actions", cell: (assignment) => <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "view", id: assignment.id })}>Details</Button>
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "status", id: assignment.id })}>Remove assignment</Button>
        </div> },
      ]} pagination={{ mode: "server", currentPage: assignments.data?.currentPage ?? filters.pageNumber ?? 1,
        pageSize: filters.pageSize ?? 10, totalItems: assignments.data?.totalItems ?? 0, totalPages: assignments.data?.totalPages ?? 0,
        onPageChange: (pageNumber) => setFilters({ ...filters, pageNumber }),
        onPageSizeChange: (pageSize) => setFilters({ ...filters, pageNumber: 1, pageSize }) }} />
    {selection ? <AssignmentDialog key={selection.mode === "create" ? "create" : `${selection.mode}:${selection.id}`}
      selection={selection} onClose={() => setSelection(null)} onSaved={(message) => { setSelection(null); setNotice(message) }} /> : null}
  </AdminPage>
}
