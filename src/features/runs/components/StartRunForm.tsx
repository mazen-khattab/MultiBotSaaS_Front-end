import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Play } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import type { FieldValues } from "react-hook-form"
import { Link } from "react-router-dom"

import { buildBotTabPath } from "@/app/router/routePaths"
import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { createRunAdapter } from "@/features/runs/adapters/createRunAdapter"
import { useCreateRun } from "@/features/runs/hooks/useCreateRun"
import { EligibleAccountsService, type ConnectedAccountDto } from "@/features/runs/services/EligibleAccountsService"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormSubmitResult, DynamicSelectOptions } from "@/shared/components/dynamic-form/dynamicForm.types"
import { Button } from "@/shared/ui/button"

interface StartRunFormProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly botId: string
  readonly config: StartRunConfig<TInput, TOutput>
  readonly options?: DynamicSelectOptions
  readonly eligibleAccounts: readonly ConnectedAccountDto[]
  readonly onCancel: () => void
  readonly onCreated?: (runId: number) => void
  readonly disabled?: boolean
  readonly unavailableReason?: string
  readonly onRefreshAccounts?: () => void
  readonly refreshingAccounts?: boolean
  readonly notice?: ReactNode
}

/** Translate contract failures into actionable form errors without a countdown. */
function getFailureMessage(error: unknown): string {
  const normalized = normalizeApiError(error)
  if ("statusCode" in normalized) {
    if (normalized.statusCode === 429) {
      return `Run cannot start yet. ${normalized.message} Wait for the current run or cooldown to finish before trying again.`
    }
    if (normalized.statusCode === 422 || normalized.statusCode === 400) {
      return `Run was not started. ${normalized.message} Review your inputs and choose an Active connected account.`
    }
    if (normalized.statusCode === 404) {
      return `Run was not started. ${normalized.message} Check your access to this bot and the selected account.`
    }
  }
  return normalized.message
}

/** Keep the same validation and eligibility checks in the full-page workflow. */
export function StartRunForm<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  botId, config, options, eligibleAccounts, onCancel, onCreated, disabled = false,
  unavailableReason, onRefreshAccounts, refreshingAccounts = false,
  notice,
}: StartRunFormProps<TInput, TOutput>) {
  const client = useQueryClient()
  const mutation = useCreateRun()
  const createdId = useRef<number | undefined>(undefined)
  const active = useRef(true)
  const [submitting, setSubmitting] = useState(false)
  const accountKey = queryKeys.accounts.list({ botId: Number(botId), eligible: true, type: "Scraping" })
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  function readReadyAccounts() {
    const state = client.getQueryState(accountKey)
    const accounts = client.getQueryData<readonly ConnectedAccountDto[]>(accountKey)
    if (!active.current || !accounts || state?.status !== "success" ||
      state.fetchStatus !== "idle" || state.isInvalidated) {
      throw { message: "Wait for eligible accounts to finish refreshing, then try again. Refresh the account options if they could not be loaded." }
    }
    return accounts
  }

  async function submit(values: TOutput): Promise<DynamicFormSubmitResult> {
    createdId.current = undefined
    try {
      const dto = await createRunAdapter(botId, values, config, eligibleAccounts)
      // Selection preparation may await module code. Refuse an obsolete query
      // before fetching, then check the current server list immediately before POST.
      readReadyAccounts()
      await client.fetchQuery({
        queryKey: accountKey,
        queryFn: ({ signal }) => EligibleAccountsService.getScrapingEligibleAccounts(Number(botId), signal),
        staleTime: 0,
      })
      if (!readReadyAccounts().some((account) => account.id === dto.connectedAccountId)) {
        throw { message: "This account is no longer eligible. Choose an eligible connected account from the refreshed options." }
      }
      createdId.current = await mutation.mutateAsync(dto)
      return { status: "success" }
    } catch (error: unknown) {
      // Only safe normalized messages reach the form; failures keep values open.
      return { status: "error", message: getFailureMessage(error) }
    }
  }
  return (
    <section aria-label={config.title ?? "Start run"} className="space-y-6">
      <Button type="button" variant="ghost" disabled={submitting} onClick={onCancel} className="gap-2 px-0">
        <ArrowLeft aria-hidden="true" /> Back to runs
      </Button>
      <div className="flex items-start gap-4 border-b pb-6">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary"><Play className="size-5" aria-hidden="true" /></div>
        <div className="min-w-0 space-y-2">
          <h3 className="text-xl font-semibold">{config.title ?? "Start run"}</h3>
          {config.description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{config.description}</p> : null}
        </div>
      </div>
      {unavailableReason ? (
        <div className="mb-5 space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm">
          <p role="status">{unavailableReason}</p>
          <p className="text-muted-foreground">Check your connected accounts, then refresh this list. The server decides which accounts can start a run.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to={buildBotTabPath(botId, "connected-accounts")}>Manage connected accounts</Link>
            </Button>
            {onRefreshAccounts ? <Button type="button" variant="ghost" size="sm"
              disabled={refreshingAccounts || mutation.isPending} onClick={onRefreshAccounts}>
              {refreshingAccounts ? "Refreshing accounts…" : "Refresh accounts"}
            </Button> : null}
          </div>
        </div>
      ) : null}
      {notice}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <DynamicForm
          config={config.form} options={options} onSubmit={submit} disabled={disabled}
          label={config.title ?? "Start run"} onCancel={onCancel}
          className="min-w-0 [&_textarea]:min-h-40 [&_textarea]:leading-relaxed"
          onSubmittingChange={(pending) => { if (active.current) setSubmitting(pending) }}
          submitLabel="Start run" submittingLabel="Starting run…"
          onSuccess={() => { if (active.current && createdId.current !== undefined) onCreated?.(createdId.current) }}
        />
        <aside aria-label="Before you start" className="rounded-xl border bg-card p-5 text-sm xl:sticky xl:top-24">
          <h4 className="font-semibold">Before you start</h4>
          <ul className="mt-4 list-disc space-y-3 pl-4 leading-6 text-muted-foreground">
            <li>Choose an available connected account.</li>
            {config.targetGroupOptionsProvider ? <li>Choose an active target group and review its saved settings.</li> : null}
            <li>Review your settings before starting. You can follow progress in Runs.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}
