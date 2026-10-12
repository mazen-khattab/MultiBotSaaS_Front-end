import { get, set, type DefaultValues, type FieldValues } from "react-hook-form"

import type { DynamicFieldDefinition, DynamicFieldRule, DynamicFormConfig, DynamicSelectOptions, DynamicSelectOptionsState } from "./dynamicForm.types"

/** Clone defaults so form edits cannot mutate a shared registry definition. */
export function getDynamicFormDefaults<TInput extends FieldValues, TOutput extends FieldValues>(config: DynamicFormConfig<TInput, TOutput>): DefaultValues<TInput> {
  const defaults = structuredClone(config.defaultValues ?? {}) as DefaultValues<TInput>
  for (const field of config.fields) {
    const existing: unknown = get(defaults, field.name)
    if (existing !== undefined) continue
    const fallback = field.type === "checkbox" || field.type === "switch" ? false : field.type === "number" ? undefined : ""
    set(defaults, field.name, field.defaultValue !== undefined ? field.defaultValue : fallback)
  }
  return defaults
}

export function evaluateFieldRule<TInput extends FieldValues>(rule: DynamicFieldRule<TInput> | undefined, values: Parameters<Exclude<DynamicFieldRule<TInput>, boolean>>[0], fallback: boolean): boolean {
  return typeof rule === "function" ? rule(values) : rule ?? fallback
}

/** Resolve a static list or a provider reference without executing a query. */
export function getFieldOptions<TInput extends FieldValues>(field: DynamicFieldDefinition<TInput>, options?: DynamicSelectOptions): DynamicSelectOptionsState | undefined {
  if (field.type !== "select") return undefined
  if (field.optionsProvider !== undefined) {
    return options?.[field.optionsProvider] ?? { items: [], error: "Options are unavailable." }
  }
  return { items: field.options }
}
