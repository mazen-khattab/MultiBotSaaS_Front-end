import { z } from "zod"

import { runAccountField, runAccountIdSchema, runAccountOptionsProvider } from "@/features/runs/forms/runAccountIdSchema"
import { runTargetGroupField, runTargetGroupIdSchema, runTargetGroupOptionsProvider } from "@/features/runs/forms/runTargetGroupField"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"

// Add this workflow's custom run fields here. Saved group configJson is separate.
export const memberScraperRunMetadataSchema = z.strictObject({})
export const memberScraperRunSchema = memberScraperRunMetadataSchema.extend({
  accountId: runAccountIdSchema,
  targetGroupId: runTargetGroupIdSchema,
})
export type MemberScraperRunValues = z.infer<typeof memberScraperRunSchema>

export const memberScraperStartRunConfig: StartRunConfig<MemberScraperRunValues> = {
  title: "Start Members Scraper",
  description: "Choose an account and target group. Member-count settings are managed in Target groups.",
  accountOptionsProvider: runAccountOptionsProvider,
  targetGroupOptionsProvider: runTargetGroupOptionsProvider,
  form: {
    schema: memberScraperRunSchema,
    sections: [{ key: "connections", title: "Account and target group", description: "Choose the account and group for this run. Member-count settings are saved with the target group.", fields: ["accountId", "targetGroupId"] }],
    defaultValues: { accountId: "", targetGroupId: "" },
    fields: [
      runAccountField,
      runTargetGroupField,
    ],
  },
  resolveSelection: (values) => ({
    connectedAccountId: Number(values.accountId),
    targetGroupId: Number(values.targetGroupId),
  }),
  serializeInfoJson: ({ accountId, targetGroupId, ...metadata }) => {
    // Selection belongs in the outer DTO, never in the custom run settings.
    void accountId
    void targetGroupId
    return JSON.stringify(memberScraperRunMetadataSchema.parse(metadata))
  },
}
