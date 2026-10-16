import { useMemo } from "react"

import { normalizeApiError } from "@/core/api/apiError"
import { createJsonGroupForm } from "@/features/groups/forms/groupFormConfig"
import { useGroupMutations } from "@/features/groups/hooks/useGroupMutations"
import type { GroupDetails } from "@/features/groups/types/groups.types"
import type { GroupsPageConfig } from "@/registry/configs/groupsConfig.types"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"

/** The module supplies configuration fields; mutations receive only API values. */
export function GroupForm({ botId, group, groupsConfig, onSaved, onCancel, onSubmittingChange }: {
  readonly botId: number
  readonly group?: GroupDetails
  readonly groupsConfig?: GroupsPageConfig
  readonly onSaved: () => void
  readonly onCancel: () => void
  readonly onSubmittingChange: (submitting: boolean) => void
}) {
  const mutation = useGroupMutations()
  const config = useMemo(() => groupsConfig?.createForm(group) ?? createJsonGroupForm(group), [group, groupsConfig])

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
