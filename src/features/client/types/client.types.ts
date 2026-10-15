import { z } from "zod"

const dailyLeadLimit = z.number().int().min(0).max(2_147_483_647)

/** GET exposes presence/masks only; unknown fields must never enter Query. */
export const userSettingsSchema = z.object({
  hasAIApiKey: z.boolean(), maskedAIApiKey: z.string(),
  hasScraperToken: z.boolean(), maskedScraperToken: z.string(),
  dailyLeadLimit, companyName: z.string().nullable(), companyPitch: z.string().nullable(),
})
export type UserSettingsDto = z.infer<typeof userSettingsSchema>

/** Section 10 permits omitted/null credentials and company fields on PUT. */
export const updateUserSettingsSchema = z.strictObject({
  dailyLeadLimit,
  aiApiKey: z.string().nullable().optional(), scraperToken: z.string().nullable().optional(),
  companyName: z.string().max(100).nullable().optional(), companyPitch: z.string().nullable().optional(),
})
export type UpdateUserSettingsDto = z.infer<typeof updateUserSettingsSchema>

export const settingsFormSchema = z.object({
  dailyLeadLimit,
  companyName: z.string().max(100, "Company name must be 100 characters or fewer."),
  companyPitch: z.string(), aiApiKey: z.string(), scraperToken: z.string(),
})
export type SettingsFormValues = z.infer<typeof settingsFormSchema>

export interface BackendCapabilityNoticeProps {
  readonly title: string
  readonly description: string
}
