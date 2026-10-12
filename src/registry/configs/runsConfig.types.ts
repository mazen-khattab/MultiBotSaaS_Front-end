import type { FieldValues } from "react-hook-form"

import type { RunCreationContext, RunSelection, RunsCapabilities } from "@/features/runs/types/runs.types"
import type { BotPageConfig } from "@/registry/botRegistry.types"
import type { FormConfig } from "@/registry/configs/formConfig.types"
import type { TableConfig } from "@/registry/configs/tableConfig.types"

/** Module-owned selection and serialization keep bot schemas out of the page. */
export interface StartRunConfig<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly form: FormConfig<TInput, TOutput>
  readonly title?: string
  readonly description?: string
  readonly resolveSelection: (values: TOutput, context: RunCreationContext) => RunSelection | Promise<RunSelection>
  // Omit only for modules with no metadata. The adapter then sends the
  // documented empty object, never JSON.stringify of arbitrary form values.
  readonly serializeInfoJson?: (values: TOutput, context: RunCreationContext) => string
}

/** TRow describes frontend columns only; no run-list DTO exists in the API. */
export interface RunsPageConfig<TInput extends FieldValues, TOutput extends FieldValues = TInput, TRow = unknown>
  extends BotPageConfig {
  readonly title: string
  readonly description?: string
  readonly table: TableConfig<TRow>
  readonly capabilities: RunsCapabilities
  readonly startRun?: StartRunConfig<TInput, TOutput>
  readonly startUnavailableReason?: string
}
