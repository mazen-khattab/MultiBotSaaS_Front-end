import { useId, useMemo, useState, type ReactNode } from "react";
import type { FieldValues } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";

import { buildBotStartRunPath } from "@/app/router/routePaths";
import { RunActions } from "@/features/runs/components/RunActions";
import { RunDetailDialog } from "@/features/runs/components/RunDetailDialog";
import { useRuns } from "@/features/runs/hooks/useRuns";
import {
  RUN_STATUSES,
  type RunDto,
  type RunStatus,
} from "@/features/runs/types/runs.types";
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types";
import type { DynamicSelectOptions } from "@/shared/components/dynamic-form/dynamicForm.types";
import { DataTable } from "@/shared/components/data-table/DataTable";
import { Button } from "@/shared/ui/button";
import StartRunPage from "./StartRunPage";

export interface GenericRunsPageProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly botId: string;
  readonly config: RunsPageConfig<TInput, TOutput>;
  readonly view?: "start-run";
  // Features supply query-backed select data and readiness, never the renderer.
  readonly options?: DynamicSelectOptions;
  readonly startDisabledReason?: string;
  // Option readiness blocks submission without hiding the creation page's recovery UI.
  readonly startFormDisabled?: boolean;
  readonly startFormNotice?: ReactNode;
}

/** Own a session per bot so late submissions cannot update another workspace. */
function RunsPageSession<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  botId,
  config,
  startDisabledReason,
}: GenericRunsPageProps<TInput, TOutput>) {
  const navigate = useNavigate();
  const location = useLocation();
  const startedRun = (location.state as { startedRun?: { botId?: string; runId?: number } } | null)?.startedRun;
  const createdId = startedRun?.botId === botId && Number.isInteger(startedRun.runId) && (startedRun.runId ?? 0) > 0
    ? startedRun.runId : null;
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
  const configurationUnavailableReason = startDisabledReason ?? config.startUnavailableReason;
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
          disabled={!canStart || Boolean(configurationUnavailableReason)}
          onClick={() => navigate(buildBotStartRunPath(botId))}
        >
          Start run
        </Button>
      </div>
      {!canStart || configurationUnavailableReason ? (
        <p className="text-sm text-muted-foreground">
          {configurationUnavailableReason ??
            "Run creation is unavailable until this module's required configuration and account data are ready."}
        </p>
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
            onRowClick={config.capabilities.canGetRun ? (run) => setSelectedRunId(run.id) : undefined}
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
    </section>
  );
}

/** Module wrappers bind their typed registry config; no bot schema is assumed. */
export default function GenericRunsPage<TInput extends FieldValues, TOutput extends FieldValues = TInput>(props: GenericRunsPageProps<TInput, TOutput>) {
  return props.view === "start-run"
    ? <StartRunPage key={props.botId} {...props} />
    : <RunsPageSession key={props.botId} {...props} />;
}
