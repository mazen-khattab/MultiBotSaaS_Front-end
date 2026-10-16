import { useId, useMemo, useState } from "react";
import type { FieldValues } from "react-hook-form";

import { StartRunModal } from "@/features/runs/components/StartRunModal";
import { RunActions } from "@/features/runs/components/RunActions";
import { RunDetailDialog } from "@/features/runs/components/RunDetailDialog";
import { useEligibleAccounts } from "@/features/runs/hooks/useEligibleAccounts";
import { useRuns } from "@/features/runs/hooks/useRuns";
import {
  RUN_STATUSES,
  type RunDto,
  type RunStatus,
} from "@/features/runs/types/runs.types";
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types";
import type { DynamicSelectOptions } from "@/shared/components/dynamic-form/dynamicForm.types";
import { DataTable } from "@/shared/components/data-table/DataTable";
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert";
import { Button } from "@/shared/ui/button";

interface GenericRunsPageProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly botId: string;
  readonly config: RunsPageConfig<TInput, TOutput>;
  // Features supply query-backed select data and readiness, never the renderer.
  readonly options?: DynamicSelectOptions;
  readonly startDisabledReason?: string;
}

/** Own a session per bot so late submissions cannot update another workspace. */
function RunsPageSession<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  botId,
  config,
  options,
  startDisabledReason,
}: GenericRunsPageProps<TInput, TOutput>) {
  const [open, setOpen] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<RunStatus | undefined>(
    undefined,
  );
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const filterId = useId();
  const canStart = config.capabilities.canCreateRun && config.startRun !== undefined;
  const runs = useRuns(
    { botId: Number(botId), pageNumber, pageSize, statusFilter },
    config.capabilities.canListRuns,
  );
  const eligible = useEligibleAccounts(Number(botId), canStart);
  const configurationUnavailableReason = startDisabledReason ?? config.startUnavailableReason;
  const unavailableReason =
    configurationUnavailableReason ??
    (canStart
      ? eligible.isPending
        ? "Loading eligible connected accounts…"
        : eligible.isError
          ? "Eligible connected accounts could not be loaded."
          : eligible.data?.length === 0
            ? "No eligible connected accounts are available for this bot."
            : undefined
      : undefined);
  // Merge feature-owned group/other options with the server's eligible accounts.
  const formOptions: DynamicSelectOptions = config.startRun
    ? {
      ...options,
      [config.startRun.accountOptionsProvider]: {
        items: (eligible.data ?? []).map((account) => ({
          value: String(account.id),
          label: account.displayName,
        })),
        isLoading: eligible.isPending,
        error: eligible.isError
          ? "Unable to load eligible accounts."
          : undefined,
        onRetry: () => {
          void eligible.refetch();
        },
      },
    }
    : (options ?? {});
  // Keep action cells stable while refetching so pending/error state survives
  // query updates for the same row, including a rejected cancellation.
  const columns = useMemo(
    () => [
      ...config.table.columns,
      {
        key: "run-actions",
        header: "Actions",
        cell: (run: RunDto) => (
          <RunActions
            run={run}
            canCancel={config.capabilities.canCancelRun}
            onView={
              config.capabilities.canGetRun
                ? () => setSelectedRunId(run.id)
                : undefined
            }
          />
        ),
      },
    ],
    [
      config.table.columns,
      config.capabilities.canCancelRun,
      config.capabilities.canGetRun,
    ],
  );

  return (
    <section aria-label={config.title} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">
            {config.title}
          </h3>
          {config.description ? (
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          // Account readiness blocks submission inside the modal, so users can
          // still open their form and see how to resolve account problems.
          disabled={!canStart || Boolean(configurationUnavailableReason)}
          onClick={() => setOpen(true)}
        >
          Start run
        </Button>
      </div>
      {!canStart || unavailableReason ? (
        <p className="text-sm text-muted-foreground">
          {unavailableReason ??
            "Run creation is unavailable until this module's required configuration and account data are ready."}
        </p>
      ) : null}
      {canStart ? (
        <ApiErrorAlert
          error={eligible.error}
          title="Unable to load eligible accounts"
          onRetry={() => {
            void eligible.refetch();
          }}
          retrying={eligible.isFetching}
        />
      ) : null}
      {createdId !== null ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          Run #{createdId} started successfully.
        </p>
      ) : null}
      {config.capabilities.canListRuns ? (
        <>
          <label htmlFor={filterId} className="flex items-center gap-3 text-sm">
            Run status
            <select
              id={filterId}
              value={statusFilter ?? ""}
              className="rounded-lg border bg-background p-2"
              onChange={(event) => {
                setStatusFilter(
                  RUN_STATUSES.find((status) => status === event.target.value),
                );
                setPageNumber(1);
              }}
            >
              <option value="">All statuses</option>
              {RUN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <DataTable
            columns={columns}
            data={runs.data?.items ?? []}
            caption={config.table.caption}
            getRowId={(run) => String(run.id)}
            isLoading={runs.isPending}
            isFetching={runs.isFetching}
            error={runs.error}
            onRetry={() => {
              void runs.refetch();
            }}
            emptyTitle={config.table.emptyTitle ?? "No runs found"}
            emptyDescription={config.table.emptyDescription}
            pagination={{
              mode: "server",
              currentPage: runs.data?.currentPage ?? pageNumber,
              pageSize,
              totalItems: runs.data?.totalItems ?? 0,
              totalPages: runs.data?.totalPages ?? 0,
              onPageChange: setPageNumber,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPageNumber(1);
              },
            }}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Run history is disabled for this module.
        </p>
      )}
      {selectedRunId !== null && config.capabilities.canGetRun ? (
        <RunDetailDialog
          runId={selectedRunId}
          botId={Number(botId)}
          onClose={() => setSelectedRunId(null)}
        />
      ) : null}
      {canStart && config.startRun ? (
        <StartRunModal
          key={open ? "open" : "closed"}
          botId={botId}
          config={config.startRun}
          options={formOptions}
          eligibleAccounts={eligible.data ?? []}
          open={open}
          disabled={Boolean(unavailableReason)}
          unavailableReason={unavailableReason}
          onRefreshAccounts={() => { void eligible.refetch(); }}
          refreshingAccounts={eligible.isFetching}
          onOpenChange={setOpen}
          onCreated={setCreatedId}
        />
      ) : null}
    </section>
  );
}

/** Module wrappers bind their typed registry config; no bot schema is assumed. */
export default function GenericRunsPage<TInput extends FieldValues, TOutput extends FieldValues = TInput>(props: GenericRunsPageProps<TInput, TOutput>) {
  return <RunsPageSession key={props.botId} {...props} />;
}
