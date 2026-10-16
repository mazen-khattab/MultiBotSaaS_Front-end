import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Gauge, KeyRound, Save, ShieldCheck } from "lucide-react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"

import { normalizeApiError } from "@/core/api/apiError"
import { settingsFormSchema, type SettingsFormValues, type UpdateUserSettingsDto, type UserSettingsDto } from "@/features/client/types/client.types"
import { Button } from "@/shared/ui/button"

const inputClass = "mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm disabled:opacity-50"

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
    <form aria-label="User settings" className="luxury-panel overflow-hidden" noValidate onSubmit={(event) => {
      // Lock before async validation so rapid submissions share one lifetime.
      event.preventDefault()
      if (submitting.current) return
      submitting.current = true
      void submit(event).finally(() => { submitting.current = false })
    }} onChange={() => { setSaved(false); clearErrors("root") }}>
      <div className="settings-intro flex items-center gap-4 px-6 py-5 sm:px-8">
        <ShieldCheck className="size-5 shrink-0 text-[var(--bronze-highlight)]" aria-hidden="true" />
        <div><p className="text-sm font-medium">A workspace tailored to you</p><p className="mt-1 text-xs text-muted-foreground">Your preferences apply across your automation workspace.</p></div>
      </div>
      <div className="signature-rule" aria-hidden="true" />
      <section className="settings-section" aria-labelledby="company-section-title">
        <div className="settings-section-heading">
          <Building2 className="size-5 text-[var(--bronze-highlight)]" aria-hidden="true" />
          <h3 id="company-section-title">Company profile</h3>
          <p>Introduce your business. Give your automations the context behind every conversation.</p>
        </div>
        <fieldset disabled={locked} className="min-w-0 space-y-5">
          <legend className="sr-only">Company profile</legend>
          <div>
            <label htmlFor="company-name" className="text-sm font-medium">Company name</label>
            <input {...register("companyName")} id="company-name" autoComplete="organization" placeholder="Your company name" className={inputClass}
              aria-invalid={Boolean(errors.companyName)} aria-describedby={errors.companyName ? "company-name-error" : undefined} />
            {errors.companyName ? <p id="company-name-error" role="alert" className="mt-1 text-sm text-red-600">{errors.companyName.message}</p> : null}
          </div>
          <div>
            <label htmlFor="company-pitch" className="text-sm font-medium">Company pitch</label>
            <textarea {...register("companyPitch")} id="company-pitch" rows={4} placeholder="What do you do, and what makes it valuable?" className={inputClass} aria-describedby="company-pitch-help" />
            <p id="company-pitch-help" className="mt-2 text-xs text-muted-foreground">A short introduction to your company and what you offer.</p>
          </div>
        </fieldset>
      </section>
      <section className="settings-section" aria-labelledby="messaging-section-title">
        <div className="settings-section-heading">
          <Gauge className="size-5 text-[var(--bronze-highlight)]" aria-hidden="true" />
          <h3 id="messaging-section-title">Messaging preferences</h3>
          <p>Set a considered pace for your daily outreach.</p>
        </div>
        <fieldset disabled={locked} className="min-w-0">
          <legend className="sr-only">Messaging preferences</legend>
          <label htmlFor="daily-lead-limit" className="text-sm font-medium">Daily message limit</label>
          <div className="mt-2 flex items-center gap-4">
            <input {...register("dailyLeadLimit", { valueAsNumber: true })} id="daily-lead-limit" type="number"
              min={0} max={2_147_483_647} step={1} className="w-44 max-w-full rounded-lg border bg-background px-4 py-3 text-sm"
              aria-invalid={Boolean(errors.dailyLeadLimit)} aria-describedby="daily-lead-limit-help daily-lead-limit-error" />
            <span className="text-xs text-muted-foreground">messages / day</span>
          </div>
          <p id="daily-lead-limit-help" className="mt-3 text-xs leading-6 text-muted-foreground">Enter a whole number from 0 through 2147483647. Zero is allowed.</p>
          {errors.dailyLeadLimit ? <p id="daily-lead-limit-error" role="alert" className="mt-1 text-sm text-red-600">Enter a whole number from 0 through 2147483647.</p> : null}
        </fieldset>
      </section>
      <section className="settings-section" aria-labelledby="credentials-section-title">
        <div className="settings-section-heading">
          <KeyRound className="size-5 text-[var(--bronze-highlight)]" aria-hidden="true" />
          <h3 id="credentials-section-title">Private connections</h3>
          <p>Manage the credentials that power your integrations.</p>
        </div>
        <fieldset disabled={locked} className="min-w-0 space-y-4">
          <legend className="sr-only">Credentials</legend>
          <p className="text-xs leading-6 text-muted-foreground">Leave replacement fields blank to keep saved credentials. Credential removal is unavailable.</p>
          {([
            { key: "aiApiKey", label: "Replacement AI API key", title: "AI API key", present: settings.hasAIApiKey, mask: settings.maskedAIApiKey },
            { key: "scraperToken", label: "Replacement scraper token", title: "Scraper token", present: settings.hasScraperToken, mask: settings.maskedScraperToken },
          ] as const).map(({ key, label, title, present, mask }) => (
            <div key={key} className="credential-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{title}</p>
                <span className="status-badge">{present ? "Configured" : "Not configured"}</span>
              </div>
              <p className="mb-4 break-all font-mono text-xs text-muted-foreground">{title}: {present ? mask || "Configured (masked value unavailable)" : "Not configured"}</p>
              <label htmlFor={`settings-${key}`} className="text-xs font-medium">{label}</label>
              <input {...register(key)} id={`settings-${key}`} type="password" autoComplete="off" spellCheck={false} placeholder="Enter a replacement credential" className={inputClass} />
            </div>
          ))}
        </fieldset>
      </section>
      <div className="settings-footer">
        <div aria-live="polite">
          {errors.root?.server ? <p role="alert" className="text-sm text-red-600">{errors.root.server.message}</p>
            : saved ? <p role="status" className="text-sm text-emerald-700">Settings saved.</p>
              : <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" aria-hidden="true" />Credentials stay masked after saving.</p>}
        </div>
        <Button type="submit" disabled={locked}><Save aria-hidden="true" />{isSubmitting ? "Saving settings…" : "Save settings"}</Button>
      </div>
    </form>
  )
}
