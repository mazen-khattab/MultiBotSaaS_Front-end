import { useState } from "react";

import { DispatchMessagesModal } from "@/features/leads/components/DispatchMessagesModal";
import { LeadProfile } from "@/features/leads/components/LeadProfile";
import { useMessagingPreview } from "@/features/leads/hooks/useMessagingPreview";
import type {
  DispatchMessagingResultDto,
  MessagingPreviewLeadDto,
} from "@/features/leads/types/leads.types";
import { DataTable } from "@/shared/components/data-table/DataTable";
import type { DataTableColumn } from "@/shared/components/data-table/dataTable.types";
import { Button } from "@/shared/ui/button";

const previewColumns: readonly DataTableColumn<MessagingPreviewLeadDto>[] = [
  { key: "number", header: "Lead", accessorKey: "leadNumber" },
  {
    key: "profile",
    header: "Profile",
    cell: (lead) => (
      <LeadProfile name={lead.profileName} url={lead.profileUrl} />
    ),
  },
  {
    key: "message",
    header: "AI message",
    cell: (lead) => (
      <p className="min-w-48 max-w-sm whitespace-pre-wrap break-words">
        {lead.aiMessage}
      </p>
    ),
  },
  { key: "status", header: "Status", accessorKey: "status" },
];

/** Display backend quota and available rows without calculating local eligibility. */
export function MessagingPreview({ botId }: { readonly botId: number }) {
  const preview = useMessagingPreview(botId);
  const [open, setOpen] = useState(false);
  const [acknowledgment, setAcknowledgment] =
    useState<DispatchMessagingResultDto | null>(null);
  const ready = Boolean(preview.data) && !preview.error && !preview.isFetching;
  const canDispatch =
    ready &&
    (preview.data?.allowedToProcessCount ?? 0) > 0 &&
    (preview.data?.leads.length ?? 0) > 0;
  const previewUnavailableReason = preview.error
    ? "Available leads could not be refreshed. Close this dialog and retry the preview before sending."
    : preview.isFetching
      ? "Refreshing available leads. Sending will be available when the preview and eligible accounts are ready."
      : !canDispatch
        ? "No leads are currently available to send messages to. Close this dialog to review the preview."
        : undefined;

  return (
    <section aria-label="Messaging preview" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Available leads</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={preview.isFetching || open}
            onClick={() => {
              void preview.refetch();
            }}
          >
            Refresh preview
          </Button>
          <Button
            type="button"
            disabled={!canDispatch || open}
            onClick={() => {
              setAcknowledgment(null);
              setOpen(true);
              // Refresh quota while the modal fetches accounts. Its Send button
              // stays disabled until both server reads are current.
              void preview.refetch();
            }}
          >
            Send message
          </Button>
        </div>
      </div>
      {preview.data && !preview.error ? (
        <dl
          aria-label="Messaging quota"
          className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3"
        >
          <div>
            <dt className="text-sm text-muted-foreground">
              Daily message limit
            </dt>
            <dd className="text-2xl font-semibold">
              {preview.data.dailyMessageLimit}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Messages sent</dt>
            <dd className="text-2xl font-semibold">
              {preview.data.messagesSent}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              Allowed to process
            </dt>
            <dd className="text-2xl font-semibold">
              {preview.data.allowedToProcessCount}
            </dd>
          </div>
        </dl>
      ) : null}
      {ready && !canDispatch ? (
        <p className="text-sm text-muted-foreground">
          No leads are currently available to send messages to.
        </p>
      ) : null}
      {acknowledgment ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          Messaging job #{acknowledgment.jobId} accepted. Status:{" "}
          {acknowledgment.status}. Leads accepted:{" "}
          {acknowledgment.totalLeadsCount}. This confirms submission; message
          delivery is still handled by the backend.
        </p>
      ) : null}
      <DataTable
        columns={previewColumns}
        data={preview.data?.leads ?? []}
        caption="Available leads for messaging"
        getRowId={(lead) => String(lead.leadId)}
        pagination={{ mode: "none" }}
        isLoading={preview.isPending}
        isFetching={preview.isFetching}
        error={preview.error}
        onRetry={() => {
          void preview.refetch();
        }}
        emptyTitle="No available leads"
      />
      {open ? (
        <DispatchMessagesModal
          botId={botId}
          previewReady={canDispatch}
          previewUnavailableReason={previewUnavailableReason}
          onClose={() => setOpen(false)}
          onDispatched={setAcknowledgment}
        />
      ) : null}
    </section>
  );
}
