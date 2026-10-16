import { z } from "zod"

import { createGroupsPageConfig } from "@/features/groups/forms/groupFormConfig"

const positiveCount = (label: string) => z.number({ error: `Enter ${label}.` })
  .int("Enter a whole number.").min(1, "Enter a number greater than zero.").max(Number.MAX_SAFE_INTEGER, "Enter a smaller count.")

export const memberScraperGroupsConfig = createGroupsPageConfig({
  schema: z.object({
    groupMembersCount: positiveCount("the group members count"),
    scrapeMembersPerCount: positiveCount("the scrape members per count"),
  }),
  fields: [
    { name: "groupMembersCount", type: "number", label: "Group members count", required: true, min: 1, step: 1,
      description: "The total number of members in this group." },
    { name: "scrapeMembersPerCount", type: "number", label: "Scrape members per count", required: true, min: 1, step: 1,
      description: "The number of members to scrape from this group per run." },
  ],
})