import type { GroupDetails, UpdateGroupInput } from "@/features/groups/types/groups.types"
import type { BotPageConfig } from "@/registry/botRegistry.types"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"

export interface GroupFormValues {
  groupName: string
  groupUrl: string
  configJson?: string
  isActive: boolean
  configuration?: Record<string, unknown>
}

/** A module builds its group form without teaching the shared page bot fields. */
export interface GroupsPageConfig extends BotPageConfig {
  // Undefined keeps the JSON editor available for legacy non-object configuration.
  readonly createForm: (group?: GroupDetails) => DynamicFormConfig<GroupFormValues, UpdateGroupInput> | undefined
}
