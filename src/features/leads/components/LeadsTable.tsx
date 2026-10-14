import { LeadProfile } from "@/features/leads/components/LeadProfile"
import { formatLeadCreatedAt } from "@/features/leads/components/leadPresentation"
import type { LeadListDto } from "@/features/leads/types/leads.types"
import { DataTable } from "@/shared/components/data-table/DataTable"
import type { DataTableColumn, DataTableProps } from "@/shared/components/data-table/dataTable.types"

/** Only documented list fields are displayed; the server owns row order. */
const columns: readonly DataTableColumn<LeadListDto>[] = [
  { key: "number", header: "Lead", accessorKey: "leadFormattedId" },
  { key: "profile", header: "Profile", cell: (lead) => <LeadProfile name={lead.profileName} url={lead.profileUrl} /> },
  { key: "message", header: "AI message", cell: (lead) => <p className="min-w-48 max-w-sm whitespace-pre-wrap break-words">{lead.aiMessage}</p> },
  { key: "group", header: "Source group", accessorKey: "fromGroup" },
  { key: "status", header: "Status", accessorKey: "status" },
  { key: "created", header: "Created", cell: (lead) => <time dateTime={lead.createdAt}>{formatLeadCreatedAt(lead.createdAt)}</time> },
]

type LeadsTableProps = Pick<DataTableProps<LeadListDto>, "data" | "pagination" | "isLoading" | "isFetching" | "error" | "onRetry">

/** Share loading/error/pagination presentation without search, sort, or export. */
export function LeadsTable(props: LeadsTableProps) {
  return <DataTable {...props} columns={columns} caption="Bot leads" getRowId={(lead) => String(lead.leadId)}
    emptyTitle="No leads found" emptyDescription="No leads match the current bot and status filter." />
}
