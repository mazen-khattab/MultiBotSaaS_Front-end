import { useEffect, useMemo, useRef } from "react"

import { normalizeApiError } from "@/core/api/apiError"
import { useUpdateLead } from "@/features/leads/hooks/useUpdateLead"
import { updateLeadSchema } from "@/features/leads/types/leads.schemas"
import type { LeadDetailsDto, UpdateLeadDto } from "@/features/leads/types/leads.types"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"

/** Snapshot defaults keep unsaved changes intact during background refetches. */
export function LeadEditForm({ lead, onSaved, onCancel }: {
  readonly lead: LeadDetailsDto
  readonly onSaved: () => void
  readonly onCancel: () => void
}) {
  const { update } = useUpdateLead(lead.botId, lead.id)
  const active = useRef(false)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])
  const config = useMemo<DynamicFormConfig<UpdateLeadDto>>(() => ({
    schema: updateLeadSchema,
    defaultValues: {
      profileName: lead.profileName,
      profileUrl: lead.profileUrl,
      aiMessage: lead.aiMessage,
      status: lead.status,
    },
    fields: [
      { name: "profileName", type: "text", label: "Profile name" },
      { name: "profileUrl", type: "text", label: "Profile URL" },
      { name: "status", type: "text", label: "Status" },
      { name: "aiMessage", type: "textarea", label: "AI message" },
    ],
    sections: [
      { key: "profile", title: "Profile information", fields: ["profileName", "profileUrl", "status"] },
      { key: "message", title: "Message", fields: ["aiMessage"] },
    ],
  }), [lead])

  return <section aria-label="Edit lead" className="luxury-panel min-w-0 space-y-5 p-5 sm:p-7">
    <div>
      <h3 className="text-xl font-semibold">Edit lead #{lead.id}</h3>
      <p className="mt-2 text-sm text-muted-foreground">Update the profile, status, and AI message. Additional details are read-only.</p>
    </div>
    <DynamicForm config={config} label="Edit lead" submitLabel="Save changes" submittingLabel="Saving…"
      className="[&_textarea]:min-h-64! [&_textarea]:[unicode-bidi:plaintext] [&_input]:[unicode-bidi:plaintext]"
      onCancel={onCancel} onSuccess={() => { if (active.current) onSaved() }}
      onSubmit={async (values) => {
        try {
          await update(values)
          return { status: "success" }
        } catch (error: unknown) {
          return { status: "error", message: normalizeApiError(error).message }
        }
      }} />
  </section>
}
