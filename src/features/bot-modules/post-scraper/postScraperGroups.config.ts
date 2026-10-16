import { z } from "zod";

import { createGroupsPageConfig } from "@/features/groups/forms/groupFormConfig";

export const postScraperGroupsConfig = createGroupsPageConfig({
  schema: z.object({
    postsPerRun: z
      .number({
        error: "Enter the number of posts to scrape.",
      })
      .int("Enter a whole number.")
      .min(1, "Enter a number greater than zero."),

    includeComments: z.boolean(),
  }),

  fields: [
    {
      name: "postsPerRun",
      type: "number",
      label: "Posts to scrape per run",
      required: true,
      min: 1,
      step: 1,
      description: "How many posts to collect from this group.",
    },
    {
      name: "includeComments",
      type: "checkbox",
      label: "Include comments",
    },
  ],

  defaultValues: {
    includeComments: false,
    postsPerRun: 10,
  },
});
