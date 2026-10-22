import { Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useRemoveLead } from "@/features/leads/hooks/useRemoveLead"
import type { LeadDetailsDto } from "@/features/leads/types/leads.types"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/ui/dialog"

/** A record owns its confirmation so late results cannot redirect another page. */
export function RemoveLeadButton({ lead, returnPath }: { readonly lead: LeadDetailsDto; readonly returnPath: string }) {
  const navigate = useNavigate()
  const mutation = useRemoveLead(lead.botId)
  const [open, setOpen] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const pending = useRef(false)
  const active = useRef(true)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  async function remove() {
    if (pending.current) return
    pending.current = true
    setFailure(null)
    try {
      await mutation.remove(lead.id)
      if (active.current) navigate(returnPath, {
        replace: true, state: { removedLead: { botId: lead.botId, leadId: lead.id } },
      })
    } catch (error: unknown) {
      if (active.current) setFailure(error)
    } finally {
      pending.current = false
    }
  }

  return <Dialog open={open} onOpenChange={(next) => {
    if (pending.current) return
    setFailure(null)
    setOpen(next)
  }}>
    <DialogTrigger asChild>
      <Button type="button" variant="destructive"><Trash2 aria-hidden="true" />Remove lead</Button>
    </DialogTrigger>
    <DialogContent
      onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus() }}
      onEscapeKeyDown={(event) => { if (pending.current) event.preventDefault() }}
      onPointerDownOutside={(event) => { if (pending.current) event.preventDefault() }}
    >
      <DialogTitle className="text-lg font-semibold">Remove lead?</DialogTitle>
      <DialogDescription className="mt-3 text-sm leading-6 [overflow-wrap:anywhere]">
        Remove lead #{lead.id}{lead.profileName ? <> — <bdi>{lead.profileName}</bdi></> : null} from your leads?
      </DialogDescription>
      <div className="mt-5 space-y-5">
        <ApiErrorAlert error={failure} title="Unable to remove lead" />
        <div className="flex flex-wrap justify-end gap-3">
          <Button ref={cancelRef} type="button" variant="outline" disabled={mutation.isPending} onClick={() => { if (!pending.current) setOpen(false) }}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={mutation.isPending} onClick={() => { void remove() }}>
            {mutation.isPending ? "Removing…" : "Confirm removal"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
}
