import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useRef, type FormEvent } from "react"
import { get, useForm, useWatch, type FieldPath, type FieldValues } from "react-hook-form"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { DynamicField } from "./DynamicField"
import { evaluateFieldRule, getDynamicFormDefaults, getFieldOptions } from "./dynamicForm.helpers"
import type { DynamicFormProps, DynamicFormSubmitResult } from "./dynamicForm.types"

/** Owns presentation and validation; the feature receives parsed values only. */
export function DynamicForm<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  config, options, onSubmit, onSuccess, onCancel, onSubmittingChange, label,
  submitLabel = "Submit", submittingLabel = "Submitting…", cancelLabel = "Cancel", disabled = false, className,
}: DynamicFormProps<TInput, TOutput>) {
  const defaultValues = useMemo(() => getDynamicFormDefaults(config), [config])
  const form = useForm<TInput, undefined, TOutput>({
    resolver: zodResolver<TInput, undefined, TOutput>(config.schema), defaultValues,
    // Visibility is presentation. Retain hidden values; the schema and feature
    // decide conditional validation and which values belong in the final DTO.
    shouldUnregister: false,
    // Focus is applied below once the disabled submitting controls are enabled.
    shouldFocusError: false,
  })
  const values = useWatch({ control: form.control })
  const inFlight = useRef(false)
  const focusAfterSubmit = useRef<FieldPath<TInput> | undefined>(undefined)
  const { setFocus } = form
  const { isSubmitting, errors } = form.formState
  useEffect(() => {
    if (!isSubmitting && focusAfterSubmit.current) {
      const name = focusAfterSubmit.current
      focusAfterSubmit.current = undefined
      setFocus(name)
    }
  }, [isSubmitting, errors, setFocus])
  const visibleFields = config.fields.filter((field) => evaluateFieldRule(field.visible, values, true))
  const fields = visibleFields.map((definition) => ({ definition, options: getFieldOptions(definition, options) }))
  const optionsBlocked = fields.some((field) => field.options?.isLoading || field.options?.error)
  const blocked = disabled || optionsBlocked
  const sections = config.sections?.map((section) => ({
    ...section,
    fields: fields.filter(({ definition }) => section.fields.includes(definition.name)),
  })).filter((section) => section.fields.length > 0)
  // New module fields remain visible even before a section is assigned to them.
  const ungroupedFields = fields.filter(({ definition }) => !config.sections?.some((section) => section.fields.includes(definition.name)))

  const renderField = ({ definition, options: fieldOptions }: (typeof fields)[number]) => (
    <DynamicField key={definition.name} definition={definition} control={form.control} getValues={form.getValues}
      disabled={disabled || isSubmitting || evaluateFieldRule(definition.disabled, values, false)} options={fieldOptions} />
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Lock synchronously, including async validation, so rapid submissions
    // cannot repeat a write before React updates the button's disabled state.
    if (inFlight.current || blocked) return
    inFlight.current = true
    onSubmittingChange?.(true)
    form.clearErrors("root")
    focusAfterSubmit.current = undefined
    try {
      await form.handleSubmit(async (parsedValues) => {
        let invalidOption = false
        for (const field of fields) {
          if (!field.options) continue
          const value: unknown = form.getValues(field.definition.name)
          if (typeof value === "string" && value !== "" && !field.options.items.some((option) => option.value === value && !option.disabled)) {
            form.setError(field.definition.name, { type: "validate", message: "Choose an available option." })
            if (!evaluateFieldRule(field.definition.disabled, values, false)) focusAfterSubmit.current ??= field.definition.name
            invalidOption = true
          }
        }
        if (invalidOption) return
        let result: void | DynamicFormSubmitResult
        try {
          result = await onSubmit(parsedValues)
        } catch {
          // Do not log exceptions or inspect transport payloads: they may contain
          // secret input. Features can return a safe error message explicitly.
          form.setError("root.submit", { message: "Unable to submit. Please try again." })
          return
        }
        if (result?.status === "error") {
          form.setError("root.submit", { message: result.message })
          return
        }
        onSuccess?.()
      }, (validationErrors) => {
        const firstInvalid = visibleFields.find((field) => {
          const error: unknown = get(validationErrors, field.name)
          return error !== undefined && !evaluateFieldRule(field.disabled, values, false)
        })
        focusAfterSubmit.current = firstInvalid?.name
        // Zod object-level refinements can have an empty path. Show them at the
        // form level as well as keeping normal field errors beside the inputs.
        const rootError: unknown = Reflect.get(validationErrors, "")
        const message = typeof rootError === "object" && rootError !== null && "message" in rootError && typeof rootError.message === "string"
          ? rootError.message : "Please review the form and try again."
        form.setError("root.validation", { message })
      })(event)
    } finally {
      inFlight.current = false
      onSubmittingChange?.(false)
    }
  }

  return (
    <form aria-label={label} aria-busy={isSubmitting} noValidate onSubmit={submit} className={cn("space-y-5", className)}>
      <fieldset disabled={disabled || isSubmitting} className="space-y-5">
        {sections?.length ? <>
          {sections.map((section) => (
            <section key={section.key} aria-label={section.title} className="rounded-xl border bg-card p-5 sm:p-6">
              <h4 className="text-base font-semibold">{section.title}</h4>
              {section.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p> : null}
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {section.fields.map((field) => <div key={field.definition.name} className={cn("min-w-0", field.definition.type === "textarea" && "md:col-span-2")}>{renderField(field)}</div>)}
              </div>
            </section>
          ))}
          {ungroupedFields.map(renderField)}
        </> : fields.map(renderField)}
      </fieldset>
      {errors.root?.submit ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.root.submit.message}</p> : null}
      {errors.root?.validation ? <p role="alert" className="text-sm text-red-600">{errors.root.validation.message}</p> : null}
      <div className="flex justify-end gap-3">
        {onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>{cancelLabel}</Button> : null}
        <Button type="submit" disabled={blocked || isSubmitting}>{isSubmitting ? submittingLabel : submitLabel}</Button>
      </div>
    </form>
  )
}
