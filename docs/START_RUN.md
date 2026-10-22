# Start run and custom bot fields

All three registered scrapers now have independent start-run forms:

| Bot | Current fields | Custom `infoJson` |
| --- | --- | --- |
| `FB-MEMBERS-SCRAPER` | Connected account, Target group | `{}` |
| `FB-POSTS-SCRAPER` | Connected account, Target group, Search term, Posts count, Post description, Analyze comment prompt, Analyze profile posts prompt, AI message structure | `{"searchTerm":"software","postsCount":10,"postDescription":"","analyzieCommentPrompt":"","analyzieProfilePrompt":"","aiMessageStructure":""}` |
| `FB-MEMBERS-MESSAGES-SCRAPER` | Connected account, Target group | `{}` |

The member bots select an account and group without extra run metadata. Their existing `groupMembersCount` and
`scrapeMembersPerCount` remain saved group `configJson` settings in Target groups.
They are not silently copied into a run's `infoJson`.

## Try the form

1. Open **My bots → choose a bot → Runs**.
2. Click **Start run** to navigate to `/dashboard/bots/{botId}/runs/start`.
   This page also supports direct visits and refreshes. It remains accessible
   while accounts load, when none are eligible, or when an account request fails.
3. Choose an eligible connected account. If none are available, use **Manage
   connected accounts** and **Refresh accounts** on the page. Eligibility is
   decided by the API; submission stays disabled until eligible accounts load.
4. Choose a **Target group**. Options come from the signed-in user's existing
   `GET /api/v1/TargetGroups/{botId}` list. Inactive groups are labeled and cannot
   be selected. If there are no active groups, use **Manage target groups**, then
   **Refresh groups**. Loading or failed group reads block submission with a
   recovery message. The Start run button still navigates to the form page.
5. For Post Scraper, enter a search term and a posts count from 1 to 1000. The
   post description, comment analysis prompt, profile posts analysis prompt, and
   AI message structure are optional textareas. Fields are grouped into account
   and target group, collection settings, and AI instructions. Empty values are
   sent as empty strings; multiline content is preserved.
6. Submit. After the API returns a valid run ID, navigation returns to Runs with
   a success acknowledgment. History and account eligibility are invalidated.
   Failed requests preserve the form values for correction or an explicit retry.
   **Cancel** and **Back to runs** return without creating a run and are disabled
   during submission. A late response after leaving cannot redirect a new workspace.

The browser sends a cookie-authenticated `POST /api/v1/scrapes`:

```json
{
  "botId": 73,
  "connectedAccountId": 12,
  "targetGroupId": 5,
  "infoJson": "{\"searchTerm\":\"software\",\"postsCount\":100,\"postDescription\":\"\",\"analyzieCommentPrompt\":\"\",\"analyzieProfilePrompt\":\"\"}"
}
```

The bot ID comes from the current workspace. The account ID comes from the
selected eligible account. `targetGroupId` is the selected group's numeric ID.
Only custom workflow settings become the JSON string; neither selection is
copied into `infoJson`. Although the API allows a nullable group, these three
forms require one. The example above is for
Post Scraper. Member bots currently send `"infoJson": "{}"`, using the documented
no-metadata path. All three use the current workspace ID and eligible account ID.

These custom field names implement the requested frontend example. The backend's
n8n workflow must consume `searchTerm`, `postsCount`, `postDescription`,
`analyzieCommentPrompt`, and `analyzieProfilePrompt` from the run's info payload.
The `analyzie` spelling is intentional to match the requested JSON keys.
The generic endpoint already exists; successful real workflow execution has not
been verified by the frontend's mocked integration tests. Group settings such as
`postsPerRun` and `includeComments` remain separate saved `configJson` fields.

## Where the code lives

| File | Purpose |
| --- | --- |
| `src/features/bot-modules/post-scraper/postScraperRunSchema.ts` | Custom field names, types, and validation rules. The account selector is added to the form schema separately. |
| `src/features/bot-modules/post-scraper/postScraperStartRun.config.ts` | Field labels, controls, defaults, account selection, and which values go into `infoJson`. |
| `src/features/bot-modules/post-scraper/postScraperRunAdapter.ts` | Validates and converts metadata to JSON text; recognizes only matching stored metadata. |
| `src/features/bot-modules/post-scraper/postScraper.module.ts` | Enables creation and connects the start form to this bot's Runs tab. |
| `src/features/bot-modules/member-scraper/memberScraperStartRun.config.ts` | Members Scraper's independent metadata schema, fields, defaults, selection, and JSON serialization. |
| `src/features/bot-modules/member-messages-scrape/memberMessagesStartRun.config.ts` | Members Messages Scraper's independent metadata schema, fields, defaults, selection, and JSON serialization. |
| `src/features/runs/forms/runTargetGroupField.ts` | Shared target-group control and positive Int32 selection validation. |
| `src/features/runs/pages/GroupRunsPage.tsx` | Loads bot-scoped group options and handles loading, empty, error, and inactive states. |

Each member bot's `*.module.ts` connects its configuration to its Runs tab.
`src/registry/botModulesRegistry.ts` registers all three exact backend codes.

## Add another custom field

For example, if the workflow supports an `includeReplies` checkbox:

1. Add `includeReplies: z.boolean()` to `postScraperRunMetadataSchema`.
2. Add `includeReplies: false` to the form's `defaultValues`.
3. Add a field to the form's `fields` array:

   ```ts
   {
     name: "includeReplies",
     label: "Include replies",
     type: "checkbox",
   }
   ```

4. Add `includeReplies: values.includeReplies` to the object passed to
   `serializeInfoJson` in `postScraperStartRun.config.ts`.

The serializer automatically writes a JSON boolean. The same pattern works for
text and number fields. Field names must match what the workflow reads.

## Add different fields to a member bot

For example, if the Members Messages workflow accepts an `includeReplies` boolean:

1. Open `memberMessagesStartRun.config.ts`.
2. Add `includeReplies: z.boolean()` to `memberMessagesRunMetadataSchema`.
3. Add `includeReplies: false` to `form.defaultValues`.
4. Add this control to `form.fields`:

   ```ts
   { name: "includeReplies", label: "Include replies", type: "checkbox" }
   ```

5. The member serializer already removes `accountId` and `targetGroupId` and validates the remaining
   metadata. It automatically includes the new field, producing
   `"infoJson": "{\"includeReplies\":false}"`.
6. Ensure that bot's workflow reads the same key, and test the exact request.

Follow the same steps in `memberScraperStartRun.config.ts` for Members Scraper.
Each bot owns a separate schema and field list; changing one leaves the others
independent. Do not add custom fields to the shared page or `CreateRunDto`.
Actual backend/n8n execution for the member bots has not been verified here.

## Register a future bot with its own fields

1. Create that bot's own schema, form config, and serializer in its module folder.
2. Create its typed `RunsPageConfig` with those settings as `startRun`.
3. Set `capabilities.canCreateRun` to `true` and `startUnavailableReason` to
   `undefined` on the completed configuration.
4. Pass that `runsConfig` to `defineLeadsScraperModule`, as Post Scraper does.
5. Register the module using its exact existing backend `uiModuleCode`.

The shared Runs page, StartRunPage/StartRunForm, and API service render and submit that module's form.
The generic fallback stays available for bots whose fields have not been supplied.

## Backend follow-up: pass the chosen group to n8n

No new browser endpoint or DTO field is needed. A read-only check of the local
`MultiBotSaaS` backend source confirmed:

- `GetAllGroupsQueryHandler` scopes the list by authenticated user and bot.
- `CreateScrapeCommandHandler` checks the selected group against that same user
  and bot, and stores its ID in `Scrape.GroupId`.
- The outgoing webhook currently contains `ScrapeId`, `Cookies`, `Info`,
  `CompanyName`, and `CompanyPitch`. It does **not** include the selected group's
  ID, URL, or saved configuration.

For workflows that need the group in the webhook request, update
`SaaS.Application/Features/Scrapes/Commands/Create/CreateScrapeCommandHandler.cs`
in the backend:

1. Load the matching group instead of only checking `AnyAsync`, preserving the
   existing user/bot ownership filters. Reject an inactive selected group too,
   matching the selector's availability rule.
2. Include its ID, `GroupUrl`, and `ConfigJson` in the webhook payload. A suggested
   addition is `TargetGroup: { Id, GroupName, GroupUrl, ConfigJson }`; agree on
   those names with the workflows before adding the payload.
3. Make each of the three n8n workflows read that selected group and its settings.

Backend files were inspected only. These webhook changes and a live workflow run
have not been performed by this frontend update.
