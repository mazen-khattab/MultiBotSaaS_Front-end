import { useState } from "react";
import { Link } from "react-router-dom";

import { buildBotTabPath } from "@/app/router/routePaths";
import { LeadStatusFilter } from "@/features/leads/components/LeadStatusFilter";
import { LeadsTable } from "@/features/leads/components/LeadsTable";
import { useLeads } from "@/features/leads/hooks/useLeads";
import type { BotTabComponentProps } from "@/registry/botRegistry.types";
import { Button } from "@/shared/ui/button";

/** Pagination and status filtering describe only the server request. */
function LeadsSession({ botId }: BotTabComponentProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const leads = useLeads({
    botId: Number(botId),
    pageNumber,
    pageSize,
    statusFilter,
  });

  return (
    <section aria-label="Leads" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-xl font-semibold">Leads</h3>
        <Button asChild>
          <Link to={buildBotTabPath(botId, "messaging-preview")}>
            Available leads
          </Link>
        </Button>
      </div>
      <LeadStatusFilter
        onChange={(status) => {
          setStatusFilter(status);
          setPageNumber(1);
        }}
      />
      <LeadsTable
        data={leads.data?.items ?? []}
        isLoading={leads.isPending}
        isFetching={leads.isFetching}
        error={leads.error}
        onRetry={() => {
          void leads.refetch();
        }}
        pagination={{
          mode: "server",
          currentPage: leads.data?.currentPage ?? pageNumber,
          pageSize,
          totalItems: leads.data?.totalItems ?? 0,
          totalPages: leads.data?.totalPages ?? 0,
          onPageChange: setPageNumber,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPageNumber(1);
          },
        }}
      />
    </section>
  );
}

/** Changing bots starts a fresh page/filter session instead of retaining old rows. */
export default function LeadsPage(props: BotTabComponentProps) {
  return <LeadsSession key={props.botId} {...props} />;
}
