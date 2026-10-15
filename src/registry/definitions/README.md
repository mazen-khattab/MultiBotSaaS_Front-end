# Leads scraper composition (Part 18)

`leadsScraper.shared.ts` composes the existing Accounts, Groups, Runs, and Leads
pages. `defineLeadsScraperModule` builds a definition; it does not register it,
fetch data, infer a platform, or grant access. The registry still selects exact
`BotDto.uiModuleCode` values returned by the backend.

`scraperModules.ts` preserves the family composition and tab order for the
members and members-messages modules. Part 19 registers the specialized
`features/bot-modules/post-scraper/postScraper.module.ts` for `FB-POSTS-SCRAPER`
through the same shared factory. These remain the only three production registrations.
`FB_LEADS_GEN` and `FB_POST_SCRAPER` are unsupported illustrative names. Unknown
backend codes continue to show the existing unsupported-module state.

## Configuration

| Configuration | Effect |
| --- | --- |
| `supportsGroups` | Includes Target groups only when true. |
| `supportsLeads` | Includes Leads and its existing Available leads preview route when true. |
| `supportsRuns` | Includes Runs only when true; requires `runsConfig`. |
| `runsConfig` | Existing typed `RunsPageConfig`, including columns, action capabilities, and optional `startRun.form` field schema. |

Accounts remain common to this family. False flags remove both sidebar entries
and component resolution for direct URLs. Definitions, capability flags, tabs,
and the page-config map are frozen. Supply readonly module-owned run configs;
the factory retains their identity and does not mutate them.

The lazy Runs wrapper binds its own typed config to `GenericRunsPage`. It keeps
the form's raw inputs, schema transforms, selection resolver, and `infoJson`
serializer together without casting an untyped route config. Each module can
supply its own start-run schema through the existing `StartRunConfig` contract.
Schemas, platform metadata, or backend payload fields are not inferred here.

These flags describe frontend implementation. Backend subscription, ownership,
account eligibility, and authorization checks remain authoritative. All current
modules retain their established pages, including the Part 17 messaging flow.
Post Scraper owns its DTO-based run columns and explicitly blocked metadata
boundary in its module folder; other specializations remain deferred.

## Integration and unavailable actions

- Accounts and Groups use the current workspace's botId in the existing services
  and query keys. Part 18 confirms `GET /api/v1/connectedaccounts/{botId}` and
  `GET /api/v1/TargetGroups/{botId}`; V2 section 7.1.2 still shows the older account
  list route. Missing botId fields in row DTOs do not imply an unscoped read.
- Run history uses the existing `GET /api/v1/scrapes` service with the positive
  current botId, server pagination, and optional status filter. Part 18 confirms
  that botId is required by the current backend despite V2's optional spelling.
  History is available, along with existing detail and cancellation actions.
- Production Start run remains disabled with an explanation until the module
  supplies its creation form and selection/serialization configuration. The
  shared factory can bind that configuration without inventing a production
  schema. Retry remains unsupported by the backend and cannot be enabled.
- The existing Leads service uses the DTO clarification recorded in
  `docs/PART_17_LEADS_AND_MESSAGING.md`, including quota preview and user-initiated
  messaging dispatch. No worker callbacks or secrets are exposed.
- The activity-log read API exists, but Logs tabs and Logs UI are outside Part 18.
  No endpoints or backend behavior are added by this composition.

## Definition of Done

- [x] Shared scraper composition reuses the existing feature pages and services.
- [x] Explicit frontend capabilities and typed start-run configuration are available.
- [x] Omitted capabilities have no tab or component; unconfigured run creation and
  unsupported retry are not presented as working actions.

Registry tests cover capability combinations and production codes. Workspace
tests cover disabled routes, per-module run configuration, scoped run-history
requests, and the existing Accounts/Groups/Leads/messaging flows. The existing
run type fixture also checks transformed forms through the shared factory.

## Verification status

Typecheck, lint, build, and Git whitespace checks passed. The build retains the
existing approximately 503 kB main-chunk warning. The new capability, direct-route,
production-history, and transformed-form regressions passed.

Full-suite completion awaits clarification of a pre-existing Leads route conflict:
the committed `LeadsService` uses `/api/v1/Leads`, explicitly preserved in Part 16's
follow-up notes, while V2 section 7.3, Part 17's notes, and Leads/workspace tests
expect `/api/leads`. This causes lead-route assertion failures and the full
Leads/messaging navigation test to fail. Part 18 preserves that service pending
confirmation of the current backend prefix; it does not silently override the
earlier change or relabel those integration failures as passing checks.

External plan documents are unchanged. Live backend calls have not been exercised.

Part 27 follow-up: the live contract confirms `/api/v1/leads/...`; the service
and fixtures now use that route. The historical six-test blocker above is resolved.
See the [testing report](../../../docs/PART_27_TESTING.md) for current checks.
