# Frontend capability matrix

Read this matrix and the [central backend blockers](./backend-blockers.md) before
adding an integration. The [live backend contract](./FRONTEND_BACKEND_CONTRACT.md)
remains authoritative. This inventory was checked against V2 §§2–18 and the current
frontend through Part 27; older Part reports describe historical implementation scope.

## How to interpret the states

| State | Backend availability | Frontend meaning |
| --- | --- | --- |
| `available` | Existing documented capability | Existing integration, subject to its documented limitations. It is not proof of authorization, deployment readiness or live verification. |
| `frontend-not-implemented` | Existing documented API | A frontend consumer or required contract/config alignment is incomplete. Never describe this as a missing generic endpoint. |
| `blocked-backend` | Required API/operation is missing | Keep the boundary explicit; do not invent routes, DTOs or successful business behavior. |
| `worker-only` | Existing external operation | No browser action. The audience distinguishes worker callbacks from the n8n webhook and their different credentials. |

The [typed inventory](../src/core/capabilities/frontendCapabilities.ts) uses the same
keys and states below. It is static descriptive metadata, with no routes, secrets,
HTTP calls, environment overrides or capability-discovery service. Pages reuse its
descriptions/status labels. This Part adds no new network integration.

There are no new global Boolean flags. Only existing UI boundaries consume the
metadata: Admin unavailable shells, client overview/purchase notices, RAG shells,
and scraper creation notices. Existing module flags and form/serializer readiness
still determine which module actions are exposed. In particular, `runCreate` being
available must not enable Start run in an unconfigured production module.

## Authentication and bot discovery

All browser API calls use the existing credentialed client (`withCredentials: true`)
and HttpOnly cookies. Identity responses never contain readable auth tokens. User
and Admin realms retain their separate login/me/refresh/logout routes and shared
refresh coordination. Authorization is endpoint-specific and remains enforced by
the backend; a matrix state does not grant a role or UserBot ownership.

| Key | State | Existing backend contract | Frontend evidence / boundary |
| --- | --- | --- | --- |
| `userAuth` | `available` | §2.1.1–2.1.3: POST `/api/v1/auth/login`, GET `/api/v1/auth/me`, POST `/api/v1/auth/refresh` | [AuthService](../src/services/auth/AuthService.ts), AuthProvider and shared refresh coordinator. |
| `adminAuth` | `available` | §2.1.5: POST `/api/v1/admin/auth/login`, GET `/api/v1/admin/auth/me`, POST `/api/v1/admin/auth/refresh` | Existing Admin auth flow. Admin/SuperAdmin and active/current-role checks are server responsibilities. |
| `userLogout` | `available` | §2.1.4, §17.3: POST `/api/v1/auth/logout` exists and returns null data | Part 27 aligns AuthService with null data and verifies context sign-out through MSW; historical boolean acknowledgments are rejected. |
| `adminLogout` | `available` | §2.1.5, §17.3: POST `/api/v1/admin/auth/logout` exists and returns null data | The same correction and context regression cover the Admin realm. |
| `registration` | `blocked-backend` | §2.1.6: no public registration API | Admin regular-user creation is a separate available operation. |
| `passwordReset` | `blocked-backend` | §2.1.6: no reset/change API | No password-reset or password-change workflow may be inferred. |
| `botCatalog` | `available` | §6.1.1: GET `/api/v1/bots` | [BotsService](../src/features/bots/services/BotsService.ts), hooks and client catalog/overview. Active catalog includes current-user ownership metadata. |
| `botSubscriptions` | `available` | §6.1.2: GET `/api/v1/bots/subscribed` | Existing assigned-bot list, including assigned inactive bots. Read access does not provide self-service assignment. |
| `botDetail` | `available` | §6.1.3–6.3: GET `/api/v1/bots/{id}`, optional `requireOwnership` | Workspace loader requests ownership and resolves the exact backend `uiModuleCode`; unregistered codes retain UnsupportedBotModule. Catalog membership, ownership, lifecycle and module support are separate. |

## Workspace data and Runs (backend Scrapes)

| Key | State | Existing backend contract | Frontend evidence / boundary |
| --- | --- | --- | --- |
| `accounts` | `available` | §7.1.2–7.1.6: GET `/api/v1/connectedaccounts/{botId}` and `/{botId}/{id}`; POST base; PUT/DELETE `/{id}` | [ConnectedAccountsService](../src/features/connected-accounts/services/ConnectedAccountsService.ts), queries, forms and table. Read paths are bot-scoped; ownership remains user-scoped on the server. |
| `eligibleAccounts` | `available` | §7.1.1: GET `/api/v1/connectedaccounts/eligible/{botId}` | [EligibleAccountsService](../src/features/runs/services/EligibleAccountsService.ts) and messaging account query. No query-only alias. Server determines activation/status/cookie eligibility and UserBot ownership. |
| `groups` | `available` | §7.2: GET `/api/v1/TargetGroups/{botId}` and `/{botId}/{id}`; POST `/api/v1/targetgroups`; PUT/DELETE `/{id}` | [GroupsService](../src/features/groups/services/GroupsService.ts), queries, forms and table. Bot-scoped reads and claims-derived user ownership. |
| `runCreate` | `available` | §8.1.1: POST `/api/v1/scrapes`, CreateScrapeDto, integer ID acknowledgment | [RunsService](../src/features/runs/services/RunsService.ts), useCreateRun, StartRunModal and adapter exist. Module workflow settings are a separate prerequisite. |
| `scraperRunConfiguration` | `available` | §3.4, §8.1.1: each registered scraper supplies its own form | [Registry](../src/registry/botModulesRegistry.ts) binds independent configurations for all three codes. Members and members-messages currently send empty metadata; Posts supplies searchTerm/maxResults. Account readiness blocks submission inside the accessible modal. The unconfigured generic fallback still has no form. See [Start run](./START_RUN.md). |
| `postScraperRunConfiguration` | `available` | Same generic create API; the user-requested frontend form supplies searchTerm and maxResults | [Post Scraper module](../src/features/bot-modules/post-scraper/postScraper.module.ts) enables the validated form and serializer. [Start run](./START_RUN.md) documents the payload and required matching workflow fields; live n8n execution remains unverified. |
| `runHistory` | `available` | §8.1.2: GET `/api/v1/scrapes` with required positive botId, pageNumber/pageSize/statusFilter | Existing Runs history hook/table; server totals drive pagination. |
| `runDetail` | `available` | §8.1.3: GET `/api/v1/scrapes/{id}` | Existing on-demand run details dialog. |
| `runCancel` | `available` | §8.1.4: POST `/api/v1/scrapes/{id}/cancel` | Existing cancellation hook/action; backend permits only Running scrapes and owns final state/eligibility. |
| `runRetry` | `blocked-backend` | §8.1.6: retry is unsupported | No retry action/service is enabled. A new Scrape is a different operation requiring valid module settings. |

Module definitions, `uiModuleCode`, capability metadata and loaded bot details are
never executable backend configuration or a substitute for ownership checks.

## Leads, messaging, activity logs and settings

| Key | State | Existing backend contract | Frontend evidence / boundary |
| --- | --- | --- | --- |
| `leadList` | `available` | §7.3.1: GET `/api/v1/leads/leads/{botId}`; paginated LeadListDto | [LeadsService](../src/features/leads/services/LeadsService.ts), hooks and table exist. Part 27 aligns the service and old test fixtures with this canonical versioned route. |
| `leadDetail` | `frontend-not-implemented` | §7.3.3, §16: GET `/api/v1/leads/{leadId}`; LeadDetailsDto exists | No detail service/hook/view is implemented. No browser ownership selector: server derives user identity and verifies a linked bot assignment. A null-bot historical lead remains owner-only. |
| `leadExport` | `blocked-backend` | §3.4, §16.3: no export API/format | Do not create an export DTO, route or pretend download. |
| `messagingPreview` | `available` | §7.3.2: GET `/api/v1/leads/bot/messaging-preview/{botId}` | Existing preview hook/view uses dailyMessageLimit, messagesSent, allowedToProcessCount and leads, not a fabricated local quota. Part 27 corrects the old route fixtures. |
| `messagingDispatch` | `available` | §7.4.1: POST `/api/v1/worker/dispatch-messaging` with browser cookie auth, no worker key | Existing account picker, adapter and dispatch hook send botId/accountId/leadIds and read jobId/status/totalLeadsCount. Acknowledgment is not delivery completion. |
| `activityLogs` | `frontend-not-implemented` | §11: GET `/api/v1/activity-logs`, role **User** only | No frontend service/hook/page exists. Supported filters: botId, opaque correlation runId, uppercase logLevel, pageNumber/pageSize. This is not an Admin audit API; runId is not a Scrape/Job ID. |
| `userSettings` | `available` | §10: GET/PUT `/api/v1/settings`, role **User** only | [UserSettingsService](../src/features/client/services/UserSettingsService.ts) and settings form exist. PUT acknowledges with the user's GUID; GET refetch supplies masks. Company/credential preservation follows §10.3. |
| `settingsCredentialRemoval` | `blocked-backend` | §10.5: no deletion semantics for credentials | Blank replacements preserve credentials. GET masks are never replacement inputs; no clear-secret behavior is invented. |

## External integrations — never browser actions

The `worker-only` state means external-only. It does **not** mean every operation
uses a worker key. Callback URLs are documented here, not placed in a browser
service or turned into controls. Never put a worker key or webhook secret in Vite
environment variables, frontend config, forms or a query cache.

| Key | State | Audience and authentication | Existing backend route |
| --- | --- | --- | --- |
| `workerLeadStatus` | `worker-only` | Worker, `x-worker-api-key` (§7.4.2) | PUT `/api/v1/worker/leads/{leadId}/status` |
| `workerJobStatus` | `worker-only` | Worker, `x-worker-api-key` (§7.4.2) | PUT `/api/v1/worker/jobs/{jobId}/status` |
| `workerAccountStatus` | `worker-only` | Worker, `x-worker-api-key` (§7.4.2) | PUT `/api/v1/worker/accounts/{accountId}/status` |
| `workerActivityLog` | `worker-only` | Worker, `x-worker-api-key` (§7.4.2, §11.3) | POST `/api/v1/worker/activity-log` |
| `scrapeCompletion` | `worker-only` | n8n webhook, **X-Webhook-Secret** (§8.1.5) | POST `/api/v1/scrapes/{id}/complete` |

Browser messaging dispatch remains `available` despite its `/worker` prefix.
Classify each operation by its authentication contract, not a route-prefix rule.

## RAG and Admin areas

| Key | State | Backend boundary | Frontend evidence / boundary |
| --- | --- | --- | --- |
| `ragKnowledgeBase` | `blocked-backend` | §6.4: no storage/upload/indexing APIs | Existing static Knowledge Base shell; no upload request or indexing simulation. |
| `ragConversations` | `blocked-backend` | §6.4: no conversations/messages APIs | Existing static Conversations shell. |
| `ragPromptSettings` | `blocked-backend` | §6.4: no prompt settings API | Existing static Prompt Settings shell; no simulated persistence. |
| `ragPlayground` | `blocked-backend` | §6.4: no playground chat API | Existing static Playground shell; no fake replies. No confirmed RAG runtime code: the conceptual CUSTOMER_SERVICE_RAG shell is not a production registry entry. Generic Bot APIs do not implement RAG. |
| `adminUsers` | `available` | §12: GET/POST `/api/v1/admin/users`; GET/PUT `/{id}`; PUT `/{id}/deactivate`, `/{id}/reactivate` | Feature-owned service, hooks, table, details and profile forms. Regular users only; no hard-delete, Admin accounts, roles or password changes. |
| `adminBots` | `available` | §13: GET/POST `/api/v1/admin/bots`; GET/PUT `/{id}`; PUT `/{id}/activate`, `/{id}/deactivate` | Feature-owned service/hooks/forms. Create inactive, deploy frontend module support, then explicitly activate. No delete; module code immutable. |
| `adminSubscriptions` | `available` | §14: GET/POST `/api/v1/admin/subscriptions`; GET/DELETE `/{id}` | UserBot access assignments; route ID is the assignment ID. Only userId/botId on POST. Legacy purchase fields are server managed; removal deletes the relationship, with no inactive history. |
| `commercialPlans` | `blocked-backend` | §6.5, §18: no commercial-plan/billing/payment APIs | UserBot assignment does not charge, create a transaction or establish recurring billing. |
| `clientPurchase` | `blocked-backend` | §6.5: no checkout or regular-user assignment/removal APIs | Client catalog remains read/navigation only. Admin assignment APIs cannot be used as regular-user self-service. |
| `adminTransactions` | `blocked-backend` | §18: no Admin HTTP API or public transaction DTO | Existing explicit unavailable shell; internal Transaction entity is not a response contract. |
| `adminAuditLogs` | `blocked-backend` | §18: no Admin audit-log read API | Existing explicit unavailable shell; User activity logs cannot substitute. |
| `adminSystemConfiguration` | `blocked-backend` | §18: no Admin system configuration API | Existing overview notice; User settings cannot substitute. |
| `adminOverviewMetrics` | `blocked-backend` | §18: no Admin dashboard/aggregate API | Existing notice and links to real management pages; no KPIs fabricated from paginated reads. |
| `clientOverviewMetrics` | `blocked-backend` | §6.5: no client overview aggregate API | Existing notice. An unpaginated catalog length is only a catalog count, not workflow/daily-run totals. |

All Admin management operations require Admin/SuperAdmin plus an active Admin
record whose current role matches the JWT. Frontend role guards remain UX only.
Neither the matrix nor an `available` record bypasses these backend checks.

## Real-time events and recovery

Existing [typed SignalR events](../src/services/realtime/signalr.events.ts), the
SignalRService, event bridge and reconnect policy implement the following boundary.
The hub is `/hubs/notifications`, uses credentialed cookies and exposes no
application client-callable join/subscribe methods.

| Key | State | Exact contract | Frontend boundary |
| --- | --- | --- | --- |
| `signalRScrapeCompleted` | `available` | §9.2–9.3: `ScrapeCompleted` → `{ scrapeId, leadsCount }` | Existing cache invalidation; zero leadsCount valid. No RunCompleted alias/runId field or cumulative counter increment. |
| `signalRLeadStatusUpdated` | `available` | §9.2–9.3: `LeadStatusUpdated` → `{ leadId, status }`, status Pending/Completed/Failed | Existing scoped/conservative invalidation; no invented botId, version or timestamp. |
| `signalRJobFailed` | `available` | §9.2–9.3: `JobFailed` → `{ jobId, message }` | Existing failure handling. Worker Job ID is not Scrape ID; watchdog notification is not emitted by every failure path. |
| `signalRProgress` | `blocked-backend` | §9.3: no progress/start/log/counter/watchdog/account-status events | No RunStarted, RunProgress, LogReceived, CounterUpdated, WatchdogStatusChanged or AccountStatusChanged subscriptions. |
| `signalRReplay` | `blocked-backend` | §9.4: no replay/resume/cursor or stateful catch-up API | Existing reconnect recovery refetches active queries through existing services; no missed-event history is promised. |
| `workerJobReads` | `blocked-backend` | §9.4: no browser worker-job list/read API | Scrape history and a dispatch acknowledgment cannot be reinterpreted as a Job-list API. |

## Maintenance and verification

1. Read the live contract, then inspect the feature service, hooks, page and module
   configuration. Classify backend availability separately from frontend readiness.
2. Update this matrix, the typed entry and the blocker document together. Preserve
   the worker/webhook audience distinction. An absent route must never be added as
   a placeholder endpoint or a successful mock outside tests.
3. Reuse shared descriptions/status labels in relevant shells. Add a runtime
   disable/hide decision only when a real UI needs it, preserving module-specific
   configuration, role guards and backend authorization. Do not gate auth recovery,
   user entitlements or server writes solely with these metadata states.
4. Run typecheck, lint, existing affected tests and build. This documentation does
   not establish live API/worker/browser verification.

Part 26 added the complete matrix, centralized blockers and shared page references.
Part 27's testing foundation corrects logout acknowledgment handling, canonical
Leads/eligibility routes, explicit count adapters and the associated fixtures.
See the [testing report](./PART_27_TESTING.md) for current verification. The six
Leads failures in [Part 25's report](./PART_25_ADMIN_FEATURES.md) were frontend test
drift and are resolved; they never indicated missing backend APIs.

### Part 26 acceptance and checks

The following records the checks at the end of Part 26. Current results are in
the Part 27 report linked above.

- [x] The matrix covers all required areas, with 52 typed entries whose states
  match the documentation. Backend availability and incomplete frontend/module
  prerequisites are recorded separately.
- [x] Backend blockers are centralized with exact missing capabilities, while
  available external operations and frontend gaps remain separate.
- [x] Existing Admin, client, RAG and scraper notices reference shared metadata.
  No new runtime permission flags, callbacks or network integrations are added.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, with the existing nonfatal main-chunk size warning.
- `npm test`: 258 passed, 6 failed, 264 total. The failures are the same five
  Leads-suite URL assertions and one workspace Leads journey documented before
  this Part. No service, auth lifecycle or test fixtures were changed here.
- Documentation audit: all 52 state rows match the typed inventory and all relative
  links in this matrix/blocker document resolve.
- `git diff --check`: passed.

The requested Part 26 artifacts and references are implemented. Repository-wide
verification remains incomplete because of the existing test-fixture failures.
Logout acknowledgment alignment, lead details, User activity-log integration and
module workflow configuration remain documented work, not changes in this Part.
The user's existing live-contract edits were read and preserved. No live backend,
worker, webhook or real-browser verification was performed.
