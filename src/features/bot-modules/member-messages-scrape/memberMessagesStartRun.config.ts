import { z } from "zod"

import { runAccountField, runAccountIdSchema, runAccountOptionsProvider } from "@/features/runs/forms/runAccountIdSchema"
import { runTargetGroupField, runTargetGroupIdSchema, runTargetGroupOptionsProvider } from "@/features/runs/forms/runTargetGroupField"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"

// This bot owns its schema independently of Members Scraper and Post Scraper.
export const memberMessagesRunMetadataSchema = z.strictObject({})
export const memberMessagesRunSchema = memberMessagesRunMetadataSchema.extend({
  accountId: runAccountIdSchema,
  targetGroupId: runTargetGroupIdSchema,
})
export type MemberMessagesRunValues = z.infer<typeof memberMessagesRunSchema>

export const memberMessagesStartRunConfig: StartRunConfig<MemberMessagesRunValues> = {
  title: "Start Members Messages Scraper",
  description: "Choose an account and target group. Member-count settings are managed in Target groups.",
  accountOptionsProvider: runAccountOptionsProvider,
  targetGroupOptionsProvider: runTargetGroupOptionsProvider,
  form: {
    defaultValues: { accountId: "", targetGroupId: "" },
    schema: memberMessagesRunSchema,
    sections: [{ key: "connections", title: "Account and target group", description: "Choose the account and group for this run. Member-count settings are saved with the target group.", fields: ["accountId", "targetGroupId"] }],
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
    void accountId
    void targetGroupId
    return JSON.stringify(memberMessagesRunMetadataSchema.parse(metadata))
  },
}
