import { useRef } from "react"
import type { FieldValues } from "react-hook-form"

import { normalizeApiError } from "@/core/api/apiError"
import { createRunAdapter } from "@/features/runs/adapters/createRunAdapter"
import { useCreateRun } from "@/features/runs/hooks/useCreateRun"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"
import { DynamicModal } from "@/shared/components/dynamic-form/DynamicModal"
import type { DynamicFormSubmitResult, DynamicSelectOptions } from "@/shared/components/dynamic-form/dynamicForm.types"

interface StartRunModalProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly botId: string
  readonly config: StartRunConfig<TInput, TOutput>
  readonly options?: DynamicSelectOptions
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated?: (runId: number) => void
  readonly disabled?: boolean
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
  botId, config, options, open, onOpenChange, onCreated, disabled = false,
}: StartRunModalProps<TInput, TOutput>) {
  const mutation = useCreateRun()
  const createdId = useRef<number | undefined>(undefined)
  async function submit(values: TOutput): Promise<DynamicFormSubmitResult> {
    createdId.current = undefined
    try {
      const dto = await createRunAdapter(botId, values, config)
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
      submitLabel="Start run" submittingLabel="Starting run…"
      onSuccess={() => { if (createdId.current !== undefined) onCreated?.(createdId.current) }} />
  )
}
