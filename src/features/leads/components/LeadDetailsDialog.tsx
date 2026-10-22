import { LeadProfile } from "@/features/leads/components/LeadProfile"
import { formatLeadCreatedAt } from "@/features/leads/components/leadPresentation"
import type { LeadListDto, MessagingPreviewLeadDto } from "@/features/leads/types/leads.types"
import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog"

/** Leads have no detail endpoint; display the fields supplied by their list. */
export function LeadDetailsDialog({ lead, onClose }: {
  readonly lead: LeadListDto | MessagingPreviewLeadDto
  readonly onClose: () => void
}) {
  const number = "leadFormattedId" in lead ? lead.leadFormattedId : lead.leadNumber

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="text-lg font-semibold">Lead details</DialogTitle>
        <DialogDescription className="mt-2 break-words text-sm">Details for {number}.</DialogDescription>
        <dl className="space-y-5 py-5 text-sm [&_dd]:mt-1 [&_dd]:whitespace-pre-wrap [&_dd]:[overflow-wrap:anywhere] [&_dt]:font-medium [&_dt]:text-muted-foreground">
          <div><dt>Lead</dt><dd>{number}</dd></div>
          <div><dt>Lead ID</dt><dd>{lead.leadId}</dd></div>
          <div><dt>Profile</dt><dd><LeadProfile name={lead.profileName} url={lead.profileUrl} /></dd></div>
          <div><dt>AI message</dt><dd>{lead.aiMessage || "—"}</dd></div>
          {"fromGroup" in lead ? <div><dt>Source group</dt><dd>{lead.fromGroup}</dd></div> : null}
          <div><dt>Status</dt><dd>{lead.status}</dd></div>
          {"createdAt" in lead ? <div><dt>Created</dt><dd><time dateTime={lead.createdAt}>{formatLeadCreatedAt(lead.createdAt)}</time></dd></div> : null}
        </dl>
        <Button type="button" variant="outline" onClick={onClose}>Close details</Button>
      </DialogContent>
    </Dialog>
  )
}
