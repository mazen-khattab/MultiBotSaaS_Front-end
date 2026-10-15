import type { ReactNode } from "react"

import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog"

export type AdminSelection<T> = { mode: "create" } | { mode: "view" | "edit" | "status"; id: T }

/** Feature dialogs wait for a fresh detail read before showing editable data. */
export function AdminRecordDialog({ title, description, busy, loading, error, onRetry, onClose, children }: {
  readonly title: string
  readonly description: string
  readonly busy: boolean
  readonly loading: boolean
  readonly error: unknown
  readonly onRetry: () => void
  readonly onClose: () => void
  readonly children: ReactNode
}) {
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
    <DialogContent onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }}
      onPointerDownOutside={(event) => { if (busy) event.preventDefault() }}>
      <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
      {loading ? <p role="status">Loading details…</p> : null}
      <ApiErrorAlert error={error} onRetry={onRetry} />
      {!loading && !error ? children : null}
      <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Close</Button>
    </DialogContent>
  </Dialog>
}

/** Render only explicit DTO fields supplied by the feature, never an entity dump. */
export function AdminDetails({ fields }: { readonly fields: Readonly<Record<string, string | number | boolean | null>> }) {
  return <dl className="grid grid-cols-2 gap-3 py-4 text-sm">
    {Object.entries(fields).map(([label, value]) => <div key={label} className="contents">
      <dt className="font-medium">{label}</dt><dd className="break-words">{value === null ? "—" : String(value)}</dd>
    </div>)}
  </dl>
}
