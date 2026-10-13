import { useMemo } from "react"
import { z } from "zod"

import { normalizeApiError } from "@/core/api/apiError"
import { getGroupLink } from "@/features/groups/adapters/groupAdapter"
import { useGroupMutations } from "@/features/groups/hooks/useGroupMutations"
import type { GroupDetails } from "@/features/groups/types/groups.types"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"

const groupFormSchema = z.object({
  groupName: z.string().trim().min(1, "Enter a group name."),
  groupUrl: z.string().trim().refine((value) => Boolean(getGroupLink(value)), "Enter an HTTP or HTTPS group URL."),
  configJson: z.string().refine((value) => {
    try { JSON.parse(value); return true } catch { return false }
  }, "Enter valid JSON configuration."),
  isActive: z.boolean(),
})
type GroupFormValues = z.infer<typeof groupFormSchema>

/** Generic form validation checks syntax; no bot-specific config is invented. */
export function GroupForm({ botId, group, onSaved, onCancel, onSubmittingChange }: {
  readonly botId: number
  readonly group?: GroupDetails
  readonly onSaved: () => void
  readonly onCancel: () => void
  readonly onSubmittingChange: (submitting: boolean) => void
}) {
  const mutation = useGroupMutations()
  const config = useMemo<DynamicFormConfig<GroupFormValues>>(() => ({
    schema: groupFormSchema,
    fields: [
      { name: "groupName", type: "text", label: "Group name", required: true },
      { name: "groupUrl", type: "text", label: "Group URL", required: true },
      { name: "configJson", type: "textarea", label: "Configuration JSON", required: true, description: "Enter the configuration required by your bot. The server validates its contents." },
      { name: "isActive", type: "checkbox", label: "Enabled" },
    ],
    defaultValues: group
      ? { groupName: group.groupName, groupUrl: group.groupUrl, configJson: group.configJson, isActive: group.isActive }
      : { groupName: "", groupUrl: "", configJson: "", isActive: true },
  }), [group])

  return <DynamicForm config={config} label={group ? "Edit target group" : "Add target group"}
    submitLabel="Save group" submittingLabel="Saving…" onCancel={onCancel}
    onSubmittingChange={onSubmittingChange} onSuccess={onSaved}
    onSubmit={async (values) => {
      try {
        if (group) await mutation.update(group.id, values)
        else await mutation.create({ botId, ...values })
        return { status: "success" }
      } catch (error: unknown) {
        return { status: "error", message: normalizeApiError(error).message }
      }
    }} />
}
