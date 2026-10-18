import { postScraperRunAdapter } from "@/features/bot-modules/post-scraper/postScraperRunAdapter"
import { postScraperRunSchema, type PostScraperRunValues } from "@/features/bot-modules/post-scraper/postScraperRunSchema"
import type { StartRunConfig } from "@/registry/configs/runsConfig.types"
import { runTargetGroupField, runTargetGroupOptionsProvider } from "@/features/runs/forms/runTargetGroupField"

/** This bot owns its labels, defaults, validation, and outgoing JSON fields. */
export const postScraperStartRunConfig: StartRunConfig<PostScraperRunValues> = {
  title: "Start Post Scraper",
  description: "Choose an account and target group, then configure the posts you want to collect.",
  // GenericRunsPage supplies this list from the existing eligible-accounts API.
  accountOptionsProvider: "post-scraper-accounts",
  targetGroupOptionsProvider: runTargetGroupOptionsProvider,
  form: {
    schema: postScraperRunSchema,
    defaultValues: { accountId: "", targetGroupId: "", searchTerm: "", maxResults: 100 },
    fields: [
      {
        name: "accountId",
        label: "Connected account",
        type: "select",
        optionsProvider: "post-scraper-accounts",
        placeholder: "Choose a connected account",
        required: true,
      },
      runTargetGroupField,
      {
        name: "searchTerm",
        label: "Search term",
        type: "text",
        placeholder: "For example, software",
        required: true,
      },
      {
        name: "maxResults",
        label: "Maximum results",
        type: "number",
        description: "Collect between 1 and 1000 results in this run.",
        min: 1,
        max: 1000,
        step: 1,
        required: true,
      },
    ],
  },
  resolveSelection: (values) => ({
    connectedAccountId: Number(values.accountId),
    targetGroupId: Number(values.targetGroupId),
  }),
  serializeInfoJson: (values) => postScraperRunAdapter.adapter.serializeInfoJson({
    searchTerm: values.searchTerm,
    maxResults: values.maxResults,
  }),
}
