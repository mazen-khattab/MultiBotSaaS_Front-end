import type { BackendCapabilityNoticeProps } from "@/features/client/types/client.types"

/** Explain a specific unavailable operation without blocking supported reads. */
export function BackendCapabilityNotice({ title, description }: BackendCapabilityNoticeProps) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </aside>
  )
}
