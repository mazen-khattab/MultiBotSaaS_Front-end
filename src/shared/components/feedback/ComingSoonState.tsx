import type { LucideIcon } from "lucide-react"

interface ComingSoonStateProps {
  icon: LucideIcon
  title: string
  description: string
  statusLabel?: string
}

/** Feature-owned readiness labels can replace the default placeholder wording. */
export function ComingSoonState({ icon: Icon, title, description, statusLabel = "Coming soon" }: ComingSoonStateProps) {
  return (
    <section className="rounded-2xl border border-dashed bg-white px-6 py-14 text-center shadow-sm">
      <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
      <span className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {statusLabel}
      </span>
    </section>
  )
}

