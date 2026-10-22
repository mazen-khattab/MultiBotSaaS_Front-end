import { useState } from "react";

import { LeadDetailsDialog } from "@/features/leads/components/LeadDetailsDialog";
import { LeadProfile } from "@/features/leads/components/LeadProfile";
import { formatLeadCreatedAt } from "@/features/leads/components/leadPresentation";
import type { LeadListDto } from "@/features/leads/types/leads.types";
import { DataTable } from "@/shared/components/data-table/DataTable";
import type {
  DataTableColumn,
  DataTableProps,
} from "@/shared/components/data-table/dataTable.types";

/** Only documented list fields are displayed; the server owns row order. */
const columns: readonly DataTableColumn<LeadListDto>[] = [
  { key: "number", header: "Lead", accessorKey: "leadFormattedId" },
  {
    key: "profile",
    header: "Profile",
    cell: (lead) => (
      <LeadProfile name={lead.profileName} url={lead.profileUrl} />
    ),
  },
  { key: "message", header: "AI message", accessorKey: "aiMessage" },
  { key: "group", header: "Source group", accessorKey: "fromGroup" },
  { key: "status", header: "Status", accessorKey: "status" },
  {
    key: "created",
    header: "Created",
    cell: (lead) => (
      <time dateTime={lead.createdAt}>
        {formatLeadCreatedAt(lead.createdAt)}
      </time>
    ),
  },
];

type LeadsTableProps = Pick<
  DataTableProps<LeadListDto>,
  "data" | "pagination" | "isLoading" | "isFetching" | "error" | "onRetry"
>;

/** Share loading/error/pagination presentation without search, sort, or export. */
export function LeadsTable(props: LeadsTableProps) {
  const [selectedLead, setSelectedLead] = useState<LeadListDto | null>(null);
  return (
    <>
      <DataTable
        {...props}
        columns={columns}
        caption="Bot leads"
        getRowId={(lead) => String(lead.leadId)}
        onRowClick={setSelectedLead}
        emptyTitle="No leads found"
        emptyDescription="No leads match the current bot and status filter."
      />
      {selectedLead ? (
        <LeadDetailsDialog
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      ) : null}
    </>
  );
}
