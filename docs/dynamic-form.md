# Dynamic forms and modals

Part 13 adds shared renderers for text, textarea, select, number, checkbox, and
switch fields. `FormConfig<TInput, TOutput>` in the registry describes a static
frontend form, while `DynamicForm` renders it with React Hook Form and Zod.
`DynamicModal` adds a controlled Radix dialog. Neither component makes requests,
loads options, knows bot module codes, or builds backend DTOs.

## Configuration and validation

The required Zod `schema` is the validation source of truth. Each field `name`
references a typed path in that schema's input, including nested paths; inline
errors use the same reference. The renderer type and `defaultValue` must match
the input field type. One schema also supports cross-field refinements and
different parsed output types. `required`, `min`, `max`, and `step` provide input
guidance; enforce constraints in the Zod schema too. Frontend validation does
not replace server validation.

```tsx
import { z } from "zod"
import type { FormConfig } from "@/registry/configs/formConfig.types"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormProps } from "@/shared/components/dynamic-form/dynamicForm.types"

const schema = z.object({
  label: z.string().trim().min(1, "Enter a label."),
  choice: z.string().min(1, "Choose an option."),
  count: z.number().int().min(1),
  enabled: z.boolean(),
})
type Input = z.input<typeof schema>
type Output = z.output<typeof schema>

const config = {
  schema,
  fields: [
    { name: "label", label: "Label", type: "text", required: true },
    { name: "choice", label: "Choice", type: "select", optionsProvider: "choices" },
    { name: "count", label: "Count", type: "number", defaultValue: 1 },
    { name: "enabled", label: "Enabled", type: "checkbox", defaultValue: false },
  ],
} satisfies FormConfig<Input, Output>

// A feature supplies its existing query result and its submission adapter.
export function ExampleForm({ options, onSubmit }: Pick<DynamicFormProps<Input, Output>, "options" | "onSubmit">) {
  return <DynamicForm label="Example" config={config} options={options} onSubmit={onSubmit} />
}
```

Form-level `defaultValues` override field defaults. Defaults are cloned and read
once per mounted form. Text and select fields fall back to an empty string,
checkbox/switch fields to false, and numbers to undefined. Clearing a number
produces undefined, never zero. Use explicit config defaults to display schema
default values. Select inputs use string values; convert numeric identifiers
in a Zod transform or the feature adapter, using the confirmed DTO contract.

`visible` and `disabled` accept a boolean or a simple pure function of current
input values. Hidden and disabled values remain in form state and are validated
by the schema. The schema must express conditional requirements, and the
feature adapter decides which values to include in its DTO. No serialized code
or backend-provided JSX is evaluated.

## Feature-owned options and submission

A select uses either static `options` or an `optionsProvider` reference. Supply
provider results through the form's `options` prop, for example:

```tsx
options={{
  choices: {
    items: featureOptions,
    isLoading: optionsQuery.isFetching,
    error: safeOptionsError,
    onRetry: () => { void optionsQuery.refetch() },
  },
}}
```

The feature hook/query layer owns retrieval, cancellation, caching, labels, and
mapping to string option values. The shared engine displays loading/error/empty
states and retries only through the supplied callback. Missing, loading, or
failed providers for visible fields block submission. Nonempty selections must
match an available, enabled option. Option values must be unique and nonempty;
the empty string is reserved for the placeholder. Empty successful lists do not
invent options; the schema decides whether an empty selection is valid.

`onSubmit` receives Zod's parsed output. Return void or `{ status: "success" }`
on success, or `{ status: "error", message: safeMessage }` on failure. Feature
adapters convert values into backend DTOs and call existing services/mutations.
The engine catches thrown submission errors with a generic message rather than
logging or inspecting transport payloads. The current backend has one overall
validation message, not a field-error map; do not guess backend field mappings.

Submission locks include asynchronous validation, preventing rapid duplicate
submits. Values and errors remain available for retry. Optional `onSuccess`,
`onCancel`, and `onSubmittingChange` connect feature UI without adding business
behavior to shared components. `disabled` prevents submission and editing.

## Modal lifecycle and sensitive values

`DynamicModal` uses the same config, options, and submit contract, plus `open`,
`onOpenChange`, `title`, and optional `description`. It closes on success,
retains input on failure, and blocks Cancel, Close, Escape, and outside dismissal
while submitting. Closing unmounts the form; reopening creates fresh defaults.
An externally abandoned submission cannot close a newer modal session. Use a
React `key` when replacing a config or editing record while a form remains open.

For secret text inputs, set `sensitive: true` to render a password input with
autocomplete disabled. Sensitive textareas disable autocomplete and remain
visible for editing. The engine keeps values only in memory and never logs or
persists them. Feature adapters must also avoid logging request payloads or
returning error messages that echo secret input. Closing a modal discards its
form state; a feature request already in flight retains only the values it needs
until it settles.

No production forms or bot configs are registered in this part. Confirmed
UiModuleCode values and bot-specific InfoJson schemas remain missing from the
backend contract. The first real Run consumer is deferred as Part 13 prescribes.
Multi-select and date/date-range renderers are deferred until a real registry
config requires them.

Verification: `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`. Tests exercise production components, modal lifecycle, safe
submission handling, option updates, and a compiled public-type fixture.
