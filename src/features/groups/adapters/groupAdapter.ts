import { z } from "zod"

import type { CreateGroupInput, UpdateGroupInput } from "@/features/groups/types/groups.types"

/** V2 normalized historical groupURL to groupUrl in both read DTOs. */
export const groupListSchema = z.object({
  id: z.number().int().positive(),
  groupName: z.string(),
  groupUrl: z.string(),
  isActive: z.boolean(),
})

// Bot scope comes from the requested route, not undocumented response fields.
export const groupDetailSchema = groupListSchema.extend({
  configJson: z.string(),
  relatedLeadsCount: z.number().int().nonnegative(),
  scrapesCount: z.number().int().nonnegative(),
}).transform(({ scrapesCount, ...group }) => ({
  ...group,
  // Counts arrive as Scrapes; existing UI models deliberately retain runsCount.
  runsCount: scrapesCount,
}))

/** Send exactly the published write fields, never detail counts or a row ID. */
export function toUpdateGroupDto(input: UpdateGroupInput) {
  return { groupName: input.groupName, groupUrl: input.groupUrl, configJson: input.configJson, isActive: input.isActive }
}

export function toCreateGroupDto(input: CreateGroupInput) {
  return { botId: input.botId, ...toUpdateGroupDto(input) }
}

/** Server strings can be displayed safely without making unsafe schemes links. */
export function getGroupLink(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined
  } catch {
    return undefined
  }
}
