import type { ComponentType } from "react"

import type { DynamicFieldType, DynamicSelectOption } from "./dynamicForm.types"

interface FieldRendererProps {
  type: DynamicFieldType
  id: string
  name: string
  value: unknown
  onChange: (value: string | number | boolean | undefined) => void
  onBlur: () => void
  inputRef: (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => void
  disabled: boolean
  required?: boolean
  invalid: boolean
  describedBy?: string
  placeholder?: string
  sensitive?: boolean
  autoComplete?: string
  min?: number
  max?: number
  step?: number | "any"
  options?: readonly DynamicSelectOption[]
}

const inputClassName = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

function TextRenderer({ inputRef, ...props }: FieldRendererProps) {
  return <input id={props.id} name={props.name} ref={inputRef}
    type={props.sensitive ? "password" : "text"} value={typeof props.value === "string" ? props.value : ""}
    onChange={(event) => props.onChange(event.target.value)} onBlur={props.onBlur}
    disabled={props.disabled} aria-required={props.required} aria-invalid={props.invalid} aria-describedby={props.describedBy}
    placeholder={props.placeholder} autoComplete={props.sensitive ? "off" : props.autoComplete} className={inputClassName} />
}

function TextareaRenderer({ inputRef, ...props }: FieldRendererProps) {
  // A sensitive text area remains editable but never persists or logs its value.
  return <textarea id={props.id} name={props.name} ref={inputRef} rows={4}
    value={typeof props.value === "string" ? props.value : ""}
    onChange={(event) => props.onChange(event.target.value)} onBlur={props.onBlur}
    disabled={props.disabled} aria-required={props.required} aria-invalid={props.invalid} aria-describedby={props.describedBy}
    placeholder={props.placeholder} autoComplete={props.sensitive ? "off" : props.autoComplete} className={inputClassName} />
}

function SelectRenderer({ inputRef, ...props }: FieldRendererProps) {
  return <select id={props.id} name={props.name} ref={inputRef}
    value={typeof props.value === "string" ? props.value : ""}
    onChange={(event) => props.onChange(event.target.value)} onBlur={props.onBlur}
    disabled={props.disabled} aria-required={props.required} aria-invalid={props.invalid} aria-describedby={props.describedBy}
    className={inputClassName}>
    <option value="">{props.placeholder ?? "Choose an option"}</option>
    {props.options?.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
  </select>
}

function NumberRenderer({ inputRef, ...props }: FieldRendererProps) {
  return <input id={props.id} name={props.name} ref={inputRef} type="number"
    value={typeof props.value === "number" && Number.isFinite(props.value) ? props.value : ""}
    // An empty number stays undefined rather than silently becoming zero.
    onChange={(event) => props.onChange(event.target.value === "" ? undefined : event.target.valueAsNumber)}
    onBlur={props.onBlur} disabled={props.disabled} aria-required={props.required}
    aria-invalid={props.invalid} aria-describedby={props.describedBy}
    placeholder={props.placeholder} min={props.min} max={props.max} step={props.step ?? "any"} className={inputClassName} />
}

function BooleanRenderer({ inputRef, ...props }: FieldRendererProps) {
  return <input id={props.id} name={props.name} ref={inputRef} type="checkbox"
    role={props.type === "switch" ? "switch" : undefined} checked={props.value === true}
    onChange={(event) => props.onChange(event.target.checked)} onBlur={props.onBlur}
    disabled={props.disabled} aria-required={props.required} aria-invalid={props.invalid} aria-describedby={props.describedBy}
    className="size-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
}

const fieldRenderers: Record<DynamicFieldType, ComponentType<FieldRendererProps>> = {
  text: TextRenderer, textarea: TextareaRenderer, select: SelectRenderer,
  number: NumberRenderer, checkbox: BooleanRenderer, switch: BooleanRenderer,
}

/** Rendering is selected only from the static, typed frontend field union. */
export function DynamicFieldRenderer(props: FieldRendererProps) {
  const Renderer = fieldRenderers[props.type]
  return <Renderer {...props} />
}
