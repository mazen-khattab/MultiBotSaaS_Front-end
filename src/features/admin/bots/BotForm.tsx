import { useMemo } from "react"
import { z } from "zod"

import { normalizeApiError } from "@/core/api/apiError"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"
import { createAdminBotSchema, type AdminBot, type CreateAdminBot } from "./bots.types"
import { useAdminBotMutations } from "./useAdminBots"

/** A stored module code is displayed but omitted from metadata updates. */
export function BotForm({ bot, onSaved, onSubmittingChange }: {
  readonly bot?: AdminBot
  readonly onSaved: () => void
  readonly onSubmittingChange: (busy: boolean) => void
}) {
  const mutation = useAdminBotMutations()
  const config = useMemo<DynamicFormConfig<CreateAdminBot>>(() => ({
    // Legacy stored codes can be displayed without making metadata edits fail
    // creation-time normalization rules. Only new codes use that validation.
    schema: createAdminBotSchema.extend({ uiModuleCode: bot ? z.string() : createAdminBotSchema.shape.uiModuleCode }),
    defaultValues: bot ? { name: bot.name, description: bot.description, currentPrice: bot.currentPrice,
      cooldownMinutes: bot.cooldownMinutes, uiModuleCode: bot.uiModuleCode }
      : { name: "", description: "", currentPrice: 0, cooldownMinutes: 180, uiModuleCode: "" },
    fields: [
      { name: "name", type: "text", label: "Bot name", required: true },
      { name: "description", type: "textarea", label: "Description" },
      { name: "currentPrice", type: "number", label: "Catalog price", min: 0, step: 0.01, required: true },
      { name: "cooldownMinutes", type: "number", label: "Cooldown minutes", min: 0, max: 2_147_483_647, step: 1 },
      { name: "uiModuleCode", type: "text", label: "UI module code", disabled: Boolean(bot), required: true,
        description: "Immutable after creation. Deploy frontend module support before activating this bot." },
    ],
  }), [bot])
  return <DynamicForm config={config} label={bot ? "Edit bot" : "Create bot"} submitLabel="Save bot"
    onSubmittingChange={onSubmittingChange} onSuccess={onSaved}
    onSubmit={async (values) => {
      try {
        if (bot) {
          const { name, description, currentPrice, cooldownMinutes } = values
          await mutation.update(bot.id, { name, description, currentPrice, cooldownMinutes })
        } else await mutation.create(values)
        return { status: "success" }
      } catch (error: unknown) { return { status: "error", message: normalizeApiError(error).message } }
    }} />
}
