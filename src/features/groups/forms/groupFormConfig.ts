import type { DeepPartialSkipArrayKey, FieldValues } from "react-hook-form"
import { z } from "zod"

import { getGroupLink } from "@/features/groups/adapters/groupAdapter"
import type { GroupDetails, UpdateGroupInput } from "@/features/groups/types/groups.types"
import type { GroupFormValues, GroupsPageConfig } from "@/registry/configs/groupsConfig.types"
import type { DynamicFieldDefinition, DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"

const commonSchema = z.object({
  groupName: z.string().trim().min(1, "Enter a group name."),
  groupUrl: z.string().trim().refine((value) => Boolean(getGroupLink(value)), "Enter an HTTP or HTTPS group URL."),
  isActive: z.boolean(),
})

const commonFields: readonly DynamicFieldDefinition<GroupFormValues>[] = [
  { name: "groupName", type: "text", label: "Group name", required: true },
  { name: "groupUrl", type: "text", label: "Group URL", required: true },
]
const enabledField: DynamicFieldDefinition<GroupFormValues> = { name: "isActive", type: "checkbox", label: "Enabled" }

function commonDefaults(group?: GroupDetails) {
  return { groupName: group?.groupName ?? "", groupUrl: group?.groupUrl ?? "", isActive: group?.isActive ?? true }
}

/** Retain a JSON editor for modules that have not declared their group fields. */
export function createJsonGroupForm(group?: GroupDetails): DynamicFormConfig<GroupFormValues, UpdateGroupInput> {
  return {
    schema: commonSchema.extend({
      configJson: z.string().refine((value) => {
        try { JSON.parse(value); return true } catch { return false }
      }, "Enter valid JSON configuration."),
    }),
    fields: [...commonFields,
      { name: "configJson", type: "textarea", label: "Configuration JSON", required: true,
        description: "Enter the configuration required by your bot. The server validates its contents." },
      enabledField],
    defaultValues: { ...commonDefaults(group), configJson: group?.configJson ?? "", configuration: {} },
  }
}

/** Bind a typed bot schema to the common group fields and API JSON boundary. */
export function createGroupsPageConfig<TInput extends FieldValues, TOutput extends FieldValues>(
  configuration: DynamicFormConfig<TInput, TOutput>,
): GroupsPageConfig {
  return Object.freeze({
    createForm(group?: GroupDetails): DynamicFormConfig<GroupFormValues, UpdateGroupInput> | undefined {
      let stored: Record<string, unknown> = {}
      if (group) {
        try {
          const parsed: unknown = JSON.parse(group.configJson)
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined
          stored = parsed as Record<string, unknown>
        } catch { return undefined }
      }

      // Prefixing preserves each module field's schema path and renderer type.
      const fields = configuration.fields.map((field) => {
        const { visible, disabled } = field
        return {
          ...field,
          name: `configuration.${field.name}`,
          visible: typeof visible === "function"
            ? (values: DeepPartialSkipArrayKey<GroupFormValues>) => visible(values.configuration as DeepPartialSkipArrayKey<TInput>) : visible,
          disabled: typeof disabled === "function"
            ? (values: DeepPartialSkipArrayKey<GroupFormValues>) => disabled(values.configuration as DeepPartialSkipArrayKey<TInput>) : disabled,
        }
      }) as DynamicFieldDefinition<GroupFormValues>[]

      return {
        schema: commonSchema.extend({ configuration: configuration.schema }).transform(({ configuration: settings, ...values }) => ({
          ...values,
          // Preserve unknown server keys when an existing group is edited.
          configJson: JSON.stringify({ ...stored, ...settings }),
        })),
        fields: [...commonFields, ...fields, enabledField],
        defaultValues: { ...commonDefaults(group), configJson: "", configuration: { ...configuration.defaultValues, ...stored } },
      }
    },
  })
}
