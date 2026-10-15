import { useState } from "react"

import { AdminListSearch } from "@/features/admin/shared/AdminListSearch"
import { AdminPage } from "@/features/admin/shared/AdminPage"
import { AdminDetails, AdminRecordDialog, type AdminSelection } from "@/features/admin/shared/AdminRecordDialog"
import { DataTable } from "@/shared/components/data-table/DataTable"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { Button } from "@/shared/ui/button"
import { UserForm } from "./UserForm"
import { useAdminUser, useAdminUserMutations, useAdminUsers } from "./useAdminUsers"
import type { AdminUserFilters } from "./users.types"

/** Fetch the selected regular user afresh before editing or changing access. */
function UserDialog({ selection, onClose, onSaved }: {
  readonly selection: AdminSelection<string>
  readonly onClose: () => void
  readonly onSaved: (notice: string) => void
}) {
  const creating = selection.mode === "create"
  const detail = useAdminUser(creating ? null : selection.id)
  const mutation = useAdminUserMutations()
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const ready = detail.isFetchedAfterMount && !detail.error && detail.data
  const user = ready ? detail.data : undefined
  const title = creating ? "Create user" : selection.mode === "edit" ? "Edit user" : selection.mode === "status" ? "Change user access" : "User details"
  return <AdminRecordDialog title={title} description="Manage a regular user account. Administrative accounts and roles are outside this API."
    busy={saving || mutation.isPending} loading={!creating && !ready && !detail.error} error={creating ? null : detail.error}
    onRetry={() => { void detail.refetch() }} onClose={onClose}>
    {creating || (selection.mode === "edit" && user) ? <UserForm user={creating ? undefined : user}
      onSubmittingChange={setSaving} onSaved={() => onSaved(creating ? "User created." : "User updated.")} /> : null}
    {selection.mode === "view" && user ? <AdminDetails fields={{ ID: user.id, Name: user.fullName, Email: user.email,
      Phone: user.phoneNumber, Status: user.isDeleted ? "Deactivated" : "Active", Created: user.createdAt }} /> : null}
    {selection.mode === "status" && user ? <div className="space-y-4">
      <p>{user.isDeleted ? `Reactivate ${user.fullName}? A fresh login will be required.` : `Deactivate ${user.fullName}? Their current session and refresh tokens will be revoked.`}</p>
      <ApiErrorAlert error={failure} />
      <Button disabled={mutation.isPending} onClick={() => {
        setFailure(null)
        void mutation.setDeactivated(user.id, !user.isDeleted)
          .then(() => onSaved(user.isDeleted ? "User reactivated." : "User deactivated."), setFailure)
      }}>Confirm {user.isDeleted ? "reactivation" : "deactivation"}</Button>
    </div> : null}
  </AdminRecordDialog>
}

/** Only contract-supported list filters and regular-user operations are offered. */
export default function AdminUsersPage() {
  const [filters, setFilters] = useState<AdminUserFilters>({ pageNumber: 1, pageSize: 10 })
  const users = useAdminUsers(filters)
  const [selection, setSelection] = useState<AdminSelection<string> | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const choose = (value: AdminSelection<string>) => { setNotice(null); setSelection(value) }
  return <AdminPage title="Users" description="Create and maintain regular user profiles and deactivate or reactivate access.">
    <Button onClick={() => choose({ mode: "create" })}>Create user</Button>
    <AdminListSearch maxLength={255} stateLabel="User status" onApply={(search, state) => setFilters({ ...filters, pageNumber: 1,
      search: search || undefined, isDeleted: state ? state === "inactive" : undefined })} />
    {notice ? <p role="status">{notice}</p> : null}
    <DataTable caption="Regular users" data={users.data?.items ?? []} getRowId={(user) => user.id}
      isLoading={users.isPending} isFetching={users.isFetching} error={users.error} onRetry={() => { void users.refetch() }}
      columns={[
        { key: "name", header: "Name", accessorKey: "fullName" }, { key: "email", header: "Email", accessorKey: "email" },
        { key: "status", header: "Status", format: (user) => user.isDeleted ? "Deactivated" : "Active" },
        { key: "actions", header: "Actions", cell: (user) => <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "view", id: user.id })}>Details</Button>
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "edit", id: user.id })}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "status", id: user.id })}>{user.isDeleted ? "Reactivate" : "Deactivate"}</Button>
        </div> },
      ]} pagination={{ mode: "server", currentPage: users.data?.currentPage ?? filters.pageNumber ?? 1,
        pageSize: filters.pageSize ?? 10, totalItems: users.data?.totalItems ?? 0, totalPages: users.data?.totalPages ?? 0,
        onPageChange: (pageNumber) => setFilters({ ...filters, pageNumber }),
        onPageSizeChange: (pageSize) => setFilters({ ...filters, pageNumber: 1, pageSize }) }} />
    {selection ? <UserDialog key={selection.mode === "create" ? "create" : `${selection.mode}:${selection.id}`}
      selection={selection} onClose={() => setSelection(null)} onSaved={(message) => { setSelection(null); setNotice(message) }} /> : null}
  </AdminPage>
}
