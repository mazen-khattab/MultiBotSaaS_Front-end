import { useState } from "react"

import { AdminListSearch } from "@/features/admin/shared/AdminListSearch"
import { AdminPage } from "@/features/admin/shared/AdminPage"
import { AdminDetails, AdminRecordDialog, type AdminSelection } from "@/features/admin/shared/AdminRecordDialog"
import { DataTable } from "@/shared/components/data-table/DataTable"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { Button } from "@/shared/ui/button"
import { BotForm } from "./BotForm"
import type { AdminBotFilters } from "./bots.types"
import { useAdminBot, useAdminBotMutations, useAdminBots } from "./useAdminBots"

/** Separate lifecycle confirmation from the immutable-code metadata form. */
function BotDialog({ selection, onClose, onSaved }: {
  readonly selection: AdminSelection<number>
  readonly onClose: () => void
  readonly onSaved: (notice: string) => void
}) {
  const creating = selection.mode === "create"
  const detail = useAdminBot(creating ? null : selection.id)
  const mutation = useAdminBotMutations()
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const ready = detail.isFetchedAfterMount && !detail.error && detail.data
  const bot = ready ? detail.data : undefined
  const title = creating ? "Create bot" : selection.mode === "edit" ? "Edit bot" : selection.mode === "status" ? "Change bot availability" : "Bot details"
  return <AdminRecordDialog title={title} description="New bots start inactive. Deploy frontend support for their module code before activating."
    busy={saving || mutation.isPending} loading={!creating && !ready && !detail.error} error={creating ? null : detail.error}
    onRetry={() => { void detail.refetch() }} onClose={onClose}>
    {creating || (selection.mode === "edit" && bot) ? <BotForm bot={creating ? undefined : bot}
      onSubmittingChange={setSaving} onSaved={() => onSaved(creating ? "Bot created inactive." : "Bot updated.")} /> : null}
    {selection.mode === "view" && bot ? <AdminDetails fields={{ ID: bot.id, Name: bot.name, Description: bot.description,
      "Catalog price": bot.currentPrice, "UI module code": bot.uiModuleCode, "Cooldown minutes": bot.cooldownMinutes,
      Active: bot.isActive, Status: bot.status }} /> : null}
    {selection.mode === "status" && bot ? <div className="space-y-4">
      <p>{bot.isActive ? `Deactivate ${bot.name}? It will leave the active catalog; assignments are preserved.` : `Activate ${bot.name}? Confirm frontend support for ${bot.uiModuleCode} is deployed.`}</p>
      <ApiErrorAlert error={failure} />
      <Button disabled={mutation.isPending} onClick={() => {
        setFailure(null)
        void mutation.setActive(bot.id, !bot.isActive)
          .then(() => onSaved(bot.isActive ? "Bot deactivated." : "Bot activated."), setFailure)
      }}>Confirm {bot.isActive ? "deactivation" : "activation"}</Button>
    </div> : null}
  </AdminRecordDialog>
}

/** The admin list includes inactive bots and never uses the active-only catalog. */
export default function AdminBotsPage() {
  const [filters, setFilters] = useState<AdminBotFilters>({ pageNumber: 1, pageSize: 10 })
  const bots = useAdminBots(filters)
  const [selection, setSelection] = useState<AdminSelection<number> | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const choose = (value: AdminSelection<number>) => { setNotice(null); setSelection(value) }
  return <AdminPage title="Bots" description="Manage bot metadata and catalog availability. UI module codes are immutable after creation.">
    <Button onClick={() => choose({ mode: "create" })}>Create bot</Button>
    <AdminListSearch maxLength={100} stateLabel="Bot status" onApply={(search, state) => setFilters({ ...filters, pageNumber: 1,
      search: search || undefined, isActive: state ? state === "active" : undefined })} />
    {notice ? <p role="status">{notice}</p> : null}
    <DataTable caption="Managed bots" data={bots.data?.items ?? []} getRowId={(bot) => String(bot.id)}
      onRowClick={(bot) => choose({ mode: "view", id: bot.id })}
      isLoading={bots.isPending} isFetching={bots.isFetching} error={bots.error} onRetry={() => { void bots.refetch() }}
      columns={[
        { key: "name", header: "Name", accessorKey: "name" }, { key: "code", header: "UI module code", accessorKey: "uiModuleCode" },
        { key: "price", header: "Catalog price", accessorKey: "currentPrice" }, { key: "status", header: "Status", accessorKey: "status" },
        { key: "actions", header: "Actions", cell: (bot) => <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "view", id: bot.id })}>Details</Button>
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "edit", id: bot.id })}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => choose({ mode: "status", id: bot.id })}>{bot.isActive ? "Deactivate" : "Activate"}</Button>
        </div> },
      ]} pagination={{ mode: "server", currentPage: bots.data?.currentPage ?? filters.pageNumber ?? 1,
        pageSize: filters.pageSize ?? 10, totalItems: bots.data?.totalItems ?? 0, totalPages: bots.data?.totalPages ?? 0,
        onPageChange: (pageNumber) => setFilters({ ...filters, pageNumber }),
        onPageSizeChange: (pageSize) => setFilters({ ...filters, pageNumber: 1, pageSize }) }} />
    {selection ? <BotDialog key={selection.mode === "create" ? "create" : `${selection.mode}:${selection.id}`}
      selection={selection} onClose={() => setSelection(null)} onSaved={(message) => { setSelection(null); setNotice(message) }} /> : null}
  </AdminPage>
}
