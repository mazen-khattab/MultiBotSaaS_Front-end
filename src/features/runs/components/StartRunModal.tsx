import { useRef, type ReactNode } from "react"
import type { FieldValues } from "react-hook-form"
import { Link } from "react-router-dom"

import { normalizeApiError } from "@/core/api/apiError"
import { createRunAdapter } from "@/features/runs/adapters/createRunAdapter"
import { useCreateRun } from "@/features/runs/hooks/useCreateRun"
import type { ConnectedAccountDto } from "@/features/runs/services/EligibleAccountsService"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"
import { DynamicModal } from "@/shared/components/dynamic-form/DynamicModal"
import type { DynamicFormSubmitResult, DynamicSelectOptions } from "@/shared/components/dynamic-form/dynamicForm.types"
import { Button } from "@/shared/ui/button"

interface StartRunModalProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly botId: string
  readonly config: StartRunConfig<TInput, TOutput>
  readonly options?: DynamicSelectOptions
  readonly eligibleAccounts: readonly ConnectedAccountDto[]
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
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

/** Reuse shared validation, duplicate-submit protection, and modal lifecycle. */
export function StartRunModal<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  botId, config, options, eligibleAccounts, open, onOpenChange, onCreated, disabled = false,
  unavailableReason, onRefreshAccounts, refreshingAccounts = false,
  notice,
}: StartRunModalProps<TInput, TOutput>) {
  const mutation = useCreateRun()
  const createdId = useRef<number | undefined>(undefined)
  async function submit(values: TOutput): Promise<DynamicFormSubmitResult> {
    createdId.current = undefined
    try {
      const dto = await createRunAdapter(botId, values, config, eligibleAccounts)
      createdId.current = await mutation.mutateAsync(dto)
      return { status: "success" }
    } catch (error: unknown) {
      // Only safe normalized messages reach the form; failures keep values open.
      return { status: "error", message: getFailureMessage(error) }
    }
  }
  return (
    <DynamicModal open={open} onOpenChange={onOpenChange}
      title={config.title ?? "Start run"} description={config.description}
      config={config.form} options={options} onSubmit={submit} disabled={disabled}
      beforeForm={<>{unavailableReason ? (
        <div className="mb-5 space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm">
          <p role="status">{unavailableReason}</p>
          <p className="text-muted-foreground">Check your connected accounts, then refresh this list. The server decides which accounts can start a run.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to={`/dashboard/bots/${botId}/connected-accounts`}>Manage connected accounts</Link>
            </Button>
            {onRefreshAccounts ? <Button type="button" variant="ghost" size="sm"
              disabled={refreshingAccounts || mutation.isPending} onClick={onRefreshAccounts}>
              {refreshingAccounts ? "Refreshing accounts…" : "Refresh accounts"}
            </Button> : null}
          </div>
        </div>
      ) : null}{notice}</>}
      submitLabel="Start run" submittingLabel="Starting run…"
      onSuccess={() => { if (createdId.current !== undefined) onCreated?.(createdId.current) }} />
  )
}
