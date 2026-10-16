import { z } from "zod"

import { runAccountIdSchema } from "@/features/runs/forms/runAccountIdSchema"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"

// This bot owns its schema independently of Members Scraper and Post Scraper.
export const memberMessagesRunMetadataSchema = z.strictObject({})
export const memberMessagesRunSchema = memberMessagesRunMetadataSchema.extend({ accountId: runAccountIdSchema })
export type MemberMessagesRunValues = z.infer<typeof memberMessagesRunSchema>

export const memberMessagesStartRunConfig: StartRunConfig<MemberMessagesRunValues> = {
  title: "Start Members Messages Scraper",
  description: "Choose an account. Member-count settings are managed in Target groups.",
  accountOptionsProvider: "member-messages-accounts",
  form: {
    schema: memberMessagesRunSchema,
    defaultValues: { accountId: "" },
    fields: [
      {
        name: "accountId",
        label: "Connected account",
        type: "select",
        optionsProvider: "member-messages-accounts",
        placeholder: "Choose a connected account",
        required: true,
      },
    ],
  },
  resolveSelection: (values) => ({ connectedAccountId: Number(values.accountId) }),
  serializeInfoJson: ({ accountId, ...metadata }) => {
    void accountId
    return JSON.stringify(memberMessagesRunMetadataSchema.parse(metadata))
  },
}
