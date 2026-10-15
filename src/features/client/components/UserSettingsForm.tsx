import { zodResolver } from "@hookform/resolvers/zod"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"

import { normalizeApiError } from "@/core/api/apiError"
import { settingsFormSchema, type SettingsFormValues, type UpdateUserSettingsDto, type UserSettingsDto } from "@/features/client/types/client.types"
import { Button } from "@/shared/ui/button"

const inputClass = "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:bg-slate-50"

/** Draft values stay in the form; saved credential masks are display-only. */
export function UserSettingsForm({ settings, save, disabled }: {
  settings: UserSettingsDto
  save: (input: UpdateUserSettingsDto) => Promise<void>
  disabled: boolean
}) {
  const [saved, setSaved] = useState(false)
  const submitting = useRef(false)
  const { register, handleSubmit, setValue, setError, clearErrors, reset,
    formState: { errors, isSubmitting, dirtyFields } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: { dailyLeadLimit: settings.dailyLeadLimit, companyName: settings.companyName ?? "",
      companyPitch: settings.companyPitch ?? "", aiApiKey: "", scraperToken: "" },
  })

  const submit = handleSubmit(async (values) => {
    clearErrors("root")
    setSaved(false)
    const { aiApiKey, scraperToken, ...publicValues } = values
    // Clear replacement fields before the HTTP operation settles, including on
    // failure. Untouched company fields are omitted to preserve existing nulls.
    const pending = save({ dailyLeadLimit: values.dailyLeadLimit, aiApiKey, scraperToken,
      ...(dirtyFields.companyName ? { companyName: values.companyName } : {}),
      ...(dirtyFields.companyPitch ? { companyPitch: values.companyPitch } : {}) })
    setValue("aiApiKey", "")
    setValue("scraperToken", "")
    values.aiApiKey = values.scraperToken = ""
    try {
      await pending
      reset({ ...publicValues, aiApiKey: "", scraperToken: "" })
      setSaved(true)
    } catch (error: unknown) {
      setError("root.server", { message: normalizeApiError(error).message })
    }
  })
  const locked = disabled || isSubmitting

  return (
    <form aria-label="User settings" className="space-y-6 rounded-2xl border bg-white p-5 sm:p-6" noValidate onSubmit={(event) => {
      // Lock before async schema validation so rapid submit events share the
      // same form lifetime and cannot reset each other's pending presentation.
      event.preventDefault()
      if (submitting.current) return
      submitting.current = true
      void submit(event).finally(() => { submitting.current = false })
    }}
      onChange={() => { setSaved(false); clearErrors("root") }}>
      <fieldset disabled={locked} className="space-y-5">
        <legend className="mb-3 text-lg font-semibold">Company and messaging</legend>
        <div>
          <label htmlFor="daily-lead-limit" className="text-sm font-medium">Daily message limit</label>
          <input {...register("dailyLeadLimit", { valueAsNumber: true })} id="daily-lead-limit" type="number"
            min={0} max={2_147_483_647} step={1} className={inputClass} aria-invalid={Boolean(errors.dailyLeadLimit)}
            aria-describedby="daily-lead-limit-help daily-lead-limit-error" />
          <p id="daily-lead-limit-help" className="mt-1 text-xs text-muted-foreground">Enter a whole number from 0 through 2147483647. Zero is allowed.</p>
          {errors.dailyLeadLimit ? <p id="daily-lead-limit-error" role="alert" className="mt-1 text-sm text-red-600">Enter a whole number from 0 through 2147483647.</p> : null}
        </div>
        <div>
          <label htmlFor="company-name" className="text-sm font-medium">Company name</label>
          <input {...register("companyName")} id="company-name" autoComplete="organization" className={inputClass}
            aria-invalid={Boolean(errors.companyName)} aria-describedby={errors.companyName ? "company-name-error" : undefined} />
          {errors.companyName ? <p id="company-name-error" role="alert" className="mt-1 text-sm text-red-600">{errors.companyName.message}</p> : null}
        </div>
        <div>
          <label htmlFor="company-pitch" className="text-sm font-medium">Company pitch</label>
          <textarea {...register("companyPitch")} id="company-pitch" rows={4} className={inputClass} />
        </div>
      </fieldset>
      <fieldset disabled={locked} className="space-y-5 border-t pt-5">
        <legend className="text-lg font-semibold">Credentials</legend>
        <p className="text-sm text-muted-foreground">Leave replacement fields blank to keep saved credentials. Credential removal is unavailable.</p>
        {([
          { key: "aiApiKey", label: "Replacement AI API key", title: "AI API key", present: settings.hasAIApiKey, mask: settings.maskedAIApiKey },
          { key: "scraperToken", label: "Replacement scraper token", title: "Scraper token", present: settings.hasScraperToken, mask: settings.maskedScraperToken },
        ] as const).map(({ key, label, title, present, mask }) => (
          <div key={key}>
            <p className="mb-2 text-sm text-muted-foreground">{title}: {present ? mask || "Configured (masked value unavailable)" : "Not configured"}</p>
            <label htmlFor={`settings-${key}`} className="text-sm font-medium">{label}</label>
            <input {...register(key)} id={`settings-${key}`} type="password" autoComplete="off" spellCheck={false} className={inputClass} />
          </div>
        ))}
      </fieldset>
      {errors.root?.server ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.root.server.message}</p> : null}
      {saved ? <p role="status" className="text-sm text-emerald-700">Settings saved.</p> : null}
      <Button type="submit" disabled={locked}>{isSubmitting ? "Saving settings…" : "Save settings"}</Button>
    </form>
  )
}
