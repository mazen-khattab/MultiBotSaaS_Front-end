import { X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { FieldValues } from "react-hook-form"

import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog"
import { DynamicForm } from "./DynamicForm"
import type { DynamicModalProps } from "./dynamicForm.types"

/** Each opening owns fresh state, so a late result cannot close another session. */
function DynamicModalSession<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  open, onOpenChange, title, description, onSuccess, ...formProps
}: DynamicModalProps<TInput, TOutput>) {
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])
  const changeOpen = (next: boolean) => {
    if (!pending.current) onOpenChange(next)
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent {...(description ? {} : { "aria-describedby": undefined })}
        onEscapeKeyDown={(event) => { if (pending.current) event.preventDefault() }}
        onPointerDownOutside={(event) => { if (pending.current) event.preventDefault() }}>
        <div className="mb-6 space-y-2 pr-8">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription> : null}
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close dialog" className="absolute top-3 right-3"
          disabled={submitting} onClick={() => changeOpen(false)}><X aria-hidden="true" /></Button>
        {/* Closing unmounts the form so reopening starts a fresh session, including
            secret input and errors. Use a key when switching records while open. */}
        {open ? <DynamicForm {...formProps} label={title}
          onSubmittingChange={(next) => { pending.current = next; if (active.current) setSubmitting(next) }}
          onCancel={() => changeOpen(false)}
          onSuccess={() => { if (active.current) { onOpenChange(false); onSuccess?.() } }} /> : null}
      </DialogContent>
    </Dialog>
  )
}

/** A controlled modal closes after success and retains input after failures. */
export function DynamicModal<TInput extends FieldValues, TOutput extends FieldValues = TInput>(props: DynamicModalProps<TInput, TOutput>) {
  return props.open ? <DynamicModalSession {...props} /> : null
}
