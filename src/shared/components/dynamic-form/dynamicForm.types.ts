import type { DefaultValues, DeepPartialSkipArrayKey, FieldPath, FieldPathByValue, FieldPathValue, FieldValues } from "react-hook-form"
import type { ZodType } from "zod"
import type { ReactNode } from "react"

export type DynamicFieldType = "text" | "textarea" | "select" | "number" | "checkbox" | "switch"

/** Rules are trusted frontend functions, evaluated against current input values. */
export type DynamicFieldRule<TInput extends FieldValues> = boolean | ((values: Readonly<DeepPartialSkipArrayKey<TInput>>) => boolean)

interface FieldDefinitionBase<TInput extends FieldValues, TName extends FieldPath<TInput>> {
  // The name is also the validation reference into the form's Zod schema.
  readonly name: TName
  readonly label: string
  readonly description?: string
  readonly defaultValue?: FieldPathValue<TInput, TName>
  readonly visible?: DynamicFieldRule<TInput>
  readonly disabled?: DynamicFieldRule<TInput>
  readonly required?: boolean
}

export interface DynamicSelectOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
}

/** Features supply query results here; the renderer never fetches options. */
export interface DynamicSelectOptionsState {
  readonly items: readonly DynamicSelectOption[]
  readonly isLoading?: boolean
  readonly error?: string
  readonly onRetry?: () => void
}

export type DynamicSelectOptions = Readonly<Record<string, DynamicSelectOptionsState | undefined>>

type TextField<TInput extends FieldValues> = {
  [TName in FieldPathByValue<TInput, string | null | undefined>]: FieldDefinitionBase<TInput, TName> & {
    readonly type: "text" | "textarea"
    readonly placeholder?: string
    readonly sensitive?: boolean
    readonly autoComplete?: string
  }
}[FieldPathByValue<TInput, string | null | undefined>]

type SelectField<TInput extends FieldValues> = {
  [TName in FieldPathByValue<TInput, string | null | undefined>]: FieldDefinitionBase<TInput, TName> & {
    readonly type: "select"
    readonly placeholder?: string
  } & (
    | { readonly options: readonly DynamicSelectOption[]; readonly optionsProvider?: never }
    | { readonly optionsProvider: string; readonly options?: never }
  )
}[FieldPathByValue<TInput, string | null | undefined>]

type NumberField<TInput extends FieldValues> = {
  [TName in FieldPathByValue<TInput, number | null | undefined>]: FieldDefinitionBase<TInput, TName> & {
    readonly type: "number"
    readonly placeholder?: string
    readonly min?: number
    readonly max?: number
    readonly step?: number | "any"
  }
}[FieldPathByValue<TInput, number | null | undefined>]

type BooleanField<TInput extends FieldValues> = {
  [TName in FieldPathByValue<TInput, boolean | undefined>]: FieldDefinitionBase<TInput, TName> & {
    readonly type: "checkbox" | "switch"
  }
}[FieldPathByValue<TInput, boolean | undefined>]

/** Each renderer accepts only compatible paths and defaults from the input type. */
export type DynamicFieldDefinition<TInput extends FieldValues> = TextField<TInput> | SelectField<TInput> | NumberField<TInput> | BooleanField<TInput>

export interface DynamicFormConfig<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly fields: readonly DynamicFieldDefinition<TInput>[]
  // A single schema owns field validation, cross-field rules, and transforms.
  readonly schema: ZodType<TOutput, TInput>
  readonly defaultValues?: DefaultValues<TInput>
}

export type DynamicFormSubmitResult = { readonly status: "success" } | { readonly status: "error"; readonly message: string }

export interface DynamicFormProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly config: DynamicFormConfig<TInput, TOutput>
  readonly options?: DynamicSelectOptions
  readonly onSubmit: (values: TOutput) => void | DynamicFormSubmitResult | Promise<void | DynamicFormSubmitResult>
  readonly onSuccess?: () => void
  readonly onCancel?: () => void
  readonly onSubmittingChange?: (submitting: boolean) => void
  readonly label: string
  readonly submitLabel?: string
  readonly submittingLabel?: string
  readonly cancelLabel?: string
  readonly disabled?: boolean
  readonly className?: string
}

export interface DynamicModalProps<TInput extends FieldValues, TOutput extends FieldValues = TInput>
  extends Omit<DynamicFormProps<TInput, TOutput>, "label" | "onCancel" | "onSubmittingChange"> {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly description?: string
  readonly beforeForm?: ReactNode
}
