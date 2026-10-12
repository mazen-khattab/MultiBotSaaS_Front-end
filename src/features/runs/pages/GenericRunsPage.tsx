import { useState } from "react"
import type { FieldValues } from "react-hook-form"

import { StartRunModal } from "@/features/runs/components/StartRunModal"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import type { DynamicSelectOptions } from "@/shared/components/dynamic-form/dynamicForm.types"
import { Button } from "@/shared/ui/button"

interface GenericRunsPageProps<TInput extends FieldValues, TOutput extends FieldValues = TInput, TRow = unknown> {
  readonly botId: string
  readonly config: RunsPageConfig<TInput, TOutput, TRow>
  // Features supply query-backed select data and readiness, never the renderer.
  readonly options?: DynamicSelectOptions
  readonly startDisabledReason?: string
}

/** Own a session per bot so late submissions cannot update another workspace. */
function RunsPageSession<TInput extends FieldValues, TOutput extends FieldValues = TInput, TRow = unknown>({
  botId, config, options, startDisabledReason,
}: GenericRunsPageProps<TInput, TOutput, TRow>) {
  const [open, setOpen] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const canStart = config.capabilities.canCreateRun && config.startRun !== undefined
  const unavailableReason = startDisabledReason ?? config.startUnavailableReason

  return (
    <section aria-label={config.title} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">{config.title}</h3>
          {config.description ? <p className="text-sm text-muted-foreground">{config.description}</p> : null}
        </div>
        <Button type="button" disabled={!canStart || Boolean(unavailableReason)} onClick={() => setOpen(true)}>Start run</Button>
      </div>
      {!canStart || unavailableReason ? <p className="text-sm text-muted-foreground">
        {unavailableReason ?? "Run creation is unavailable until this module's required configuration and account data are ready."}
      </p> : null}
      {createdId !== null ? <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Run #{createdId} started successfully.
      </p> : null}
      {/* A table config is ready for future integration. No rows, status, or
          history can be inferred from create responses or completion events. */}
      <div className="rounded-xl border bg-card p-6">
        <h4 className="font-semibold">{config.table.caption}</h4>
        {!config.capabilities.canListRuns ? <p className="mt-2 text-sm text-muted-foreground">
          Run history is currently unavailable. Previous runs and current run details cannot be loaded yet.
        </p> : null}
      </div>
      {canStart && config.startRun ? <StartRunModal key={open ? "open" : "closed"}
        botId={botId} config={config.startRun} options={options} open={open}
        disabled={Boolean(unavailableReason)} onOpenChange={setOpen} onCreated={setCreatedId} /> : null}
    </section>
  )
}

/** Module wrappers bind their typed registry config; no bot schema is assumed. */
export default function GenericRunsPage<TInput extends FieldValues, TOutput extends FieldValues = TInput, TRow = unknown>(
  props: GenericRunsPageProps<TInput, TOutput, TRow>,
) {
  return <RunsPageSession key={props.botId} {...props} />
}
