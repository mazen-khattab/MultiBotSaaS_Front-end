import { useMemo } from "react"

import { getGroupLink } from "@/features/groups/adapters/groupAdapter"
import type { Group } from "@/features/groups/types/groups.types"
import { DataTable } from "@/shared/components/data-table/DataTable"
import type { DataTableColumn } from "@/shared/components/data-table/dataTable.types"
import { Button } from "@/shared/ui/button"

/** Keep unsupported server URLs readable without creating an executable link. */
export function GroupLink({ value }: { readonly value: string }) {
  const href = getGroupLink(value)
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 underline">{value}</a> : <span className="break-all">{value}</span>
}

/** The server scopes rows to the bot; the table does not filter or reorder them. */
export function GroupsTable({ groups, isLoading, isFetching, error, onRetry, onSelect }: {
  readonly groups: readonly Group[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly error: unknown
  readonly onRetry: () => void
  readonly onSelect: (mode: "view" | "edit" | "delete", id: number) => void
}) {
  const columns = useMemo<readonly DataTableColumn<Group>[]>(() => [
    { key: "name", header: "Group", accessorKey: "groupName" },
    { key: "url", header: "Group URL", cell: (group) => <GroupLink value={group.groupUrl} /> },
    { key: "activation", header: "Enabled", format: (group) => group.isActive ? "Enabled" : "Disabled" },
    { key: "actions", header: "Actions", cell: (group) => <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" aria-label={`View ${group.groupName}`} onClick={() => onSelect("view", group.id)}>View</Button>
      <Button type="button" variant="outline" size="sm" aria-label={`Edit ${group.groupName}`} onClick={() => onSelect("edit", group.id)}>Edit</Button>
      <Button type="button" variant="destructive" size="sm" aria-label={`Delete ${group.groupName}`} onClick={() => onSelect("delete", group.id)}>Delete</Button>
    </div> },
  ], [onSelect])

  return <DataTable columns={columns} data={groups} caption="Bot target groups" getRowId={(group) => String(group.id)}
    onRowClick={(group) => onSelect("view", group.id)}
    pagination={{ mode: "none" }} isLoading={isLoading} isFetching={isFetching} error={error} onRetry={onRetry}
    emptyTitle="No target groups" emptyDescription="Add a target group for the current bot." />
}
