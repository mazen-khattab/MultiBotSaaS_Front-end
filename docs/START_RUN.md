# Start run and custom bot fields

All three registered scrapers now have independent start-run forms:

| Bot | Current fields | Custom `infoJson` |
| --- | --- | --- |
| `FB-MEMBERS-SCRAPER` | Connected account | `{}` |
| `FB-POSTS-SCRAPER` | Connected account, Search term, Maximum results | `{"searchTerm":"software","maxResults":100}` |
| `FB-MEMBERS-MESSAGES-SCRAPER` | Connected account | `{}` |

The member bots start with account selection because their custom run field names
have not been supplied. Their existing `groupMembersCount` and
`scrapeMembersPerCount` remain saved group `configJson` settings in Target groups.
They are not silently copied into a run's `infoJson`.

## Try the form

1. Open **My bots → choose a bot → Runs**.
2. Click **Start run**. The configured modal can open even while accounts load,
   when none are eligible, or when the account request fails.
3. Choose an eligible connected account. If none are available, use **Manage
   connected accounts** and **Refresh accounts** in the modal. Eligibility is
   decided by the API; submission stays disabled until eligible accounts load.
4. For Post Scraper, enter a search term and choose a maximum from 1 to 1000.
5. Submit. The dialog closes after the API returns a valid run ID. History and
   account eligibility refresh. A failed request keeps the form open and preserves
   the values so the user can correct them or explicitly retry.

The browser sends a cookie-authenticated `POST /api/v1/scrapes`:

```json
{
  "botId": 73,
  "connectedAccountId": 12,
  "infoJson": "{\"searchTerm\":\"software\",\"maxResults\":100}"
}
```

The bot ID comes from the current workspace. The account ID comes from the
selected eligible account. Only the custom settings become the JSON string.
The optional `targetGroupId` is omitted by these forms. The example above is for
Post Scraper. Member bots currently send `"infoJson": "{}"`, using the documented
no-metadata path. All three use the current workspace ID and eligible account ID.

These custom field names implement the requested frontend example. The backend's
n8n workflow must consume `searchTerm` and `maxResults` from the run's info payload.
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

5. The member serializer already removes `accountId` and validates the remaining
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

The shared Runs page, modal, and API service render and submit that module's form.
The generic fallback stays available for bots whose fields have not been supplied.
