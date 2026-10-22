import { ArrowLeft, ExternalLink, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { buildBotTabPath } from "@/app/router/routePaths";
import { LeadMetadata } from "@/features/leads/components/LeadMetadata";
import { RemoveLeadButton } from "@/features/leads/components/RemoveLeadButton";
import {
  formatLeadCreatedAt,
  getLeadProfileLink,
} from "@/features/leads/components/leadPresentation";
import { useLead } from "@/features/leads/hooks/useLead";
import {
  botIdSchema,
  leadIdSchema,
} from "@/features/leads/types/leads.schemas";
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

/** Always fetch the detail DTO; list rows are neither complete nor authoritative. */
export default function LeadDetailsPage({
  botId,
  leadId,
}: {
  readonly botId: string;
  readonly leadId: string;
}) {
  const location = useLocation();
  const fromPreview =
    (location.state as { leadDetailsSource?: unknown } | null)
      ?.leadDetailsSource === "messaging-preview";
  const returnPath = buildBotTabPath(
    botId,
    fromPreview ? "messaging-preview" : "leads",
  );
  const query = useLead(
    Number(botId),
    /^\d+$/.test(leadId) ? Number(leadId) : NaN,
  );
  const valid =
    botIdSchema.safeParse(Number(botId)).success &&
    /^\d+$/.test(leadId) &&
    leadIdSchema.safeParse(Number(leadId)).success;
  const lead = query.data;
  const href = lead ? getLeadProfileLink(lead.profileUrl) : undefined;
  const records = lead
    ? ([
        ["Lead ID", lead.id],
        ["Bot ID", lead.botId],
        ["Group ID", lead.groupId],
        ["Account ID", lead.accountId],
        ["Scrape ID", lead.scrapeId],
        ["External ID", lead.externalId],
        ["Status", lead.status],
      ] as const)
    : [];

  return (
    <section aria-label="Lead details" className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link to={returnPath}>
            <ArrowLeft aria-hidden="true" />
            {fromPreview ? "Back to available leads" : "Back to leads"}
          </Link>
        </Button>
        {valid && lead && !query.isError ? (
          <RemoveLeadButton
            key={`${lead.botId}:${lead.id}`}
            lead={lead}
            returnPath={returnPath}
          />
        ) : null}
      </div>
      {!valid ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Select a valid lead to view its details.
        </p>
      ) : query.isPending ? (
        <div
          role="status"
          aria-label="Loading lead details"
          className="space-y-5"
        >
          <span className="sr-only">Loading lead details…</span>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : query.isError ? (
        <ApiErrorAlert
          error={query.error}
          title="Unable to load lead details"
          onRetry={() => {
            void query.refetch();
          }}
          retrying={query.isFetching}
        />
      ) : lead ? (
        <>
          <div className="luxury-panel flex flex-col items-start justify-between gap-5 p-5 sm:flex-row sm:p-7">
            <div className="flex min-w-0 w-full flex-1 items-start gap-4">
              <div className="hidden size-12 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary sm:flex">
                <UserRound className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-2">
                <p className="eyebrow">Lead #{lead.id}</p>
                <h3
                  dir="auto"
                  className="text-xl font-semibold [overflow-wrap:anywhere]"
                >
                  {lead.profileName || "Unnamed profile"}
                </h3>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-start gap-2 text-sm text-primary underline"
                  >
                    <span dir="ltr" className="[overflow-wrap:anywhere]">
                      {lead.profileUrl}
                    </span>
                    <ExternalLink
                      className="mt-1 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                ) : (
                  <p
                    dir="auto"
                    className="text-sm text-muted-foreground [overflow-wrap:anywhere]"
                  >
                    {lead.profileUrl || "No profile URL provided."}
                  </p>
                )}
              </div>
            </div>
            <span className="status-badge max-w-full [overflow-wrap:anywhere]">
              {lead.status}
            </span>
          </div>
          <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-6">
              <section
                aria-label="AI message"
                className="luxury-panel min-w-0 p-5 sm:p-7"
              >
                <h3 className="mb-5 text-lg font-semibold">AI message</h3>
                <p
                  dir="auto"
                  className="whitespace-pre-wrap text-sm leading-8 [overflow-wrap:anywhere]"
                >
                  {lead.aiMessage || "No AI message provided."}
                </p>
              </section>
              <section
                aria-label="Additional details"
                className="luxury-panel min-w-0 p-5 sm:p-7"
              >
                <h3 className="mb-5 text-lg font-semibold">
                  Additional details
                </h3>
                <LeadMetadata metadataJson={lead.metadataJson} />
              </section>
            </div>
            <section
              aria-label="Record details"
              className="luxury-panel min-w-0 p-5 sm:p-7"
            >
              <h3 className="mb-5 text-lg font-semibold">Record details</h3>
              <dl className="space-y-5 text-sm">
                {records.map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd
                      dir="auto"
                      className="whitespace-pre-wrap [overflow-wrap:anywhere]"
                    >
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>
                    <time dateTime={lead.createdAt}>
                      {formatLeadCreatedAt(lead.createdAt)}
                    </time>
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Processed</dt>
                  <dd>
                    {lead.processedAt ? (
                      <time dateTime={lead.processedAt}>
                        {formatLeadCreatedAt(lead.processedAt)}
                      </time>
                    ) : (
                      "Not processed"
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
