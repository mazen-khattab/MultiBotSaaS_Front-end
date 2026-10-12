import type { FieldValues } from "react-hook-form"

import type { DynamicFieldDefinition, DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"

/** Registry definitions describe UI; feature adapters own backend DTO conversion. */
export type FormFieldConfig<TInput extends FieldValues> = DynamicFieldDefinition<TInput>
export type FormConfig<TInput extends FieldValues, TOutput extends FieldValues = TInput> = DynamicFormConfig<TInput, TOutput>
