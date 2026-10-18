import type { FieldValues } from "react-hook-form"

import type { RunCreationContext, RunDto, RunSelection, RunsCapabilities } from "@/features/runs/types/runs.types"
import type { BotPageConfig } from "@/registry/botRegistry.types"
import type { FormConfig } from "@/registry/configs/formConfig.types"
import type { TableConfig } from "@/registry/configs/tableConfig.types"

/** Module-owned selection and serialization keep bot schemas out of the page. */
export interface StartRunConfig<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly form: FormConfig<TInput, TOutput>
  readonly title?: string
  readonly description?: string
  readonly resolveSelection: (values: TOutput, context: RunCreationContext) => RunSelection | Promise<RunSelection>
  // The generic page injects eligible API results under this module-owned key.
  readonly accountOptionsProvider: string
  // The scraper composition loads this bot's groups only when requested.
  readonly targetGroupOptionsProvider?: string
  // Omit only for modules with no metadata. The adapter then sends the
  // documented empty object, never JSON.stringify of arbitrary form values.
  readonly serializeInfoJson?: (values: TOutput, context: RunCreationContext) => string
}

/** Module-defined columns consume the real RunDto returned by list/detail. */
export interface RunsPageConfig<TInput extends FieldValues, TOutput extends FieldValues = TInput>
  extends BotPageConfig {
  readonly title: string
  readonly description?: string
  readonly table: TableConfig<RunDto>
  readonly capabilities: RunsCapabilities
  readonly startRun?: StartRunConfig<TInput, TOutput>
  readonly startUnavailableReason?: string
}
