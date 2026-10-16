import { z } from "zod"

import { runAccountIdSchema } from "@/features/runs/forms/runAccountIdSchema"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"

// Add this workflow's custom run fields here. Saved group configJson is separate.
export const memberScraperRunMetadataSchema = z.strictObject({})
export const memberScraperRunSchema = memberScraperRunMetadataSchema.extend({ accountId: runAccountIdSchema })
export type MemberScraperRunValues = z.infer<typeof memberScraperRunSchema>

export const memberScraperStartRunConfig: StartRunConfig<MemberScraperRunValues> = {
  title: "Start Members Scraper",
  description: "Choose an account. Member-count settings are managed in Target groups.",
  accountOptionsProvider: "member-scraper-accounts",
  form: {
    schema: memberScraperRunSchema,
    defaultValues: { accountId: "" },
    fields: [
      {
        name: "accountId",
        label: "Connected account",
        type: "select",
        optionsProvider: "member-scraper-accounts",
        placeholder: "Choose a connected account",
        required: true,
      },
    ],
  },
  resolveSelection: (values) => ({ connectedAccountId: Number(values.accountId) }),
  serializeInfoJson: ({ accountId, ...metadata }) => {
    // Selection belongs in the outer DTO, never in the custom run settings.
    void accountId
    return JSON.stringify(memberScraperRunMetadataSchema.parse(metadata))
  },
}
