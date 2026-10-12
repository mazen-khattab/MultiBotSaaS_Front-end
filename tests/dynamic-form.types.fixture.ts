import { z } from "zod"

import type { FormConfig, FormFieldConfig } from "@/registry/configs/formConfig.types"
import type { DynamicFormProps } from "@/shared/components/dynamic-form/dynamicForm.types"

const schema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  choice: z.string().transform((value) => Number(value)),
  enabled: z.boolean(),
  nested: z.object({ note: z.string().optional() }),
})
type Input = z.input<typeof schema>
type Output = z.output<typeof schema>

// This fixture is compiled by the test suite and never bundled into the app.
export const config = {
  schema,
  fields: [
    { name: "name", label: "Name", type: "text", defaultValue: "" },
    { name: "quantity", label: "Quantity", type: "number", defaultValue: 2 },
    { name: "choice", label: "Choice", type: "select", optionsProvider: "choices" },
    { name: "enabled", label: "Enabled", type: "switch", defaultValue: false },
    { name: "nested.note", label: "Note", type: "textarea", defaultValue: "" },
  ],
} satisfies FormConfig<Input, Output>

export const props = {
  label: "Typed example", config,
  onSubmit: (values) => { values.choice.toFixed(0) },
} satisfies DynamicFormProps<Input, Output>

// @ts-expect-error Field names must exist in the schema's input type.
export const unknownName: FormFieldConfig<Input> = { name: "missing", label: "Bad", type: "text" }
// @ts-expect-error Number renderers cannot target a string field.
export const wrongRenderer: FormFieldConfig<Input> = { name: "name", label: "Bad", type: "number" }
// @ts-expect-error A number field's default must be numeric.
export const wrongDefault: FormFieldConfig<Input> = { name: "quantity", label: "Bad", type: "number", defaultValue: "2" }
// @ts-expect-error A select must use either static options or a provider reference.
export const ambiguousOptions: FormFieldConfig<Input> = { name: "choice", label: "Bad", type: "select", options: [], optionsProvider: "choices" }
