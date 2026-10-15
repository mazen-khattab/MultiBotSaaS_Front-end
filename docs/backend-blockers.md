# Central backend blockers

Use the [capability matrix](./frontend-capability-matrix.md) and
[typed metadata](../src/core/capabilities/frontendCapabilities.ts) with the
[live backend contract](./FRONTEND_BACKEND_CONTRACT.md). This list records actual
missing operations; old Part reports must not turn implemented APIs into blockers.
No speculative endpoint, DTO, permission, enum, persistence or fake success is
authorized by a shell, an internal entity or a capability record.

## Missing APIs and operations

| Capability / missing operation | Contract | Required boundary before integration |
| --- | --- | --- |
| `registration` | §2.1.6 | Public registration API and request/response contract. Admin-created regular users already work and are separate. |
| `passwordReset` | §2.1.6 | Documented password reset/change operations. Admin profile update must not accept a password or role. |
| `runRetry` | §8.1.6 | Defined retry operation and semantics. Creating a new Scrape is not retrying an existing record. |
| `leadExport` | §3.4, §16.3 | Defined export operation and output format. No made-up download or CSV contract. |
| `settingsCredentialRemoval` | §10.5 | Explicit credential deletion semantics. Blank/null replacement credentials currently preserve stored values. |
| `ragKnowledgeBase`, `ragConversations`, `ragPromptSettings`, `ragPlayground` | §6.4 | RAG-specific APIs/DTOs plus a confirmed runtime uiModuleCode and module registration. Generic bot creation is insufficient; do not invent a replacement RAG code. |
| `commercialPlans`, `clientPurchase` | §6.5, §18 | Commercial plans, billing/checkout/payment contracts and any regular-user self-service assignment API. Existing Admin UserBot assignment makes no charge or transaction. |
| `adminTransactions` | §18 | Admin transaction API and public response DTO. Internal Transaction properties establish neither. |
| `adminAuditLogs` | §18 | Admin audit-log read API. Role-User activity logs are scoped to their owner and cannot substitute. |
| `adminSystemConfiguration` | §18 | Admin system configuration API. User settings do not configure the platform. |
| `adminOverviewMetrics`, `clientOverviewMetrics` | §6.5, §18 | Dedicated aggregate/dashboard contracts; no invented KPIs from partial pages. |
| `signalRProgress` | §9.3 | Documented additional emitted events and payloads before implementing progress/start/log/counter/watchdog/account updates. No RunCompleted alias exists. |
| `signalRReplay` | §9.4 | Explicit replay/resume history and cursor semantics. Current reconnect recovery refetches data and cannot promise missed-event replay. |
| `workerJobReads` | §9.4 | A browser-authorized worker-job list/read API. Do not substitute Scrape IDs for Job IDs. |
| Regular-user hard-delete; administrative-account/role management | §12, §18 | Separate documented operations. Existing Users APIs support regular-user creation/profile update and deactivation/reactivation only. |
| Bot delete or module-code migration | §13, §18 | Separate documented operations. Existing metadata updates cannot change uiModuleCode, even before activation. |
| Assignment update/pause/renew/removal history | §14 | Domain/API support beyond row-presence ownership. Removing an assignment physically deletes that relationship; isActive=false is an empty page, not history. |
| Capability discovery / remote feature flags | §3.4 | No backend discovery API exists. This Part uses static frontend metadata; no discovery request is needed or added. |

There are no runtime flags for hypothetical hard-delete, role-management or
assignment-history controls, because no such UI exists. Their absence is documented
here without introducing a production action.

## Existing APIs with frontend or module prerequisites

These are **not missing generic backend endpoints**. Keep their implementation
gaps visible as `frontend-not-implemented` rather than `blocked-backend`.

| Entry | Available backend / exact remaining work |
| --- | --- |
| `leadDetail` | GET `/api/v1/leads/{leadId}` and LeadDetailsDto exist (§16). The frontend needs its service, query and view; use the server's owner/linked-assignment rules and nullable fields. |
| `activityLogs` | GET `/api/v1/activity-logs` exists for role User (§11). The frontend needs its read service/page. Correlation runId is opaque and must not be inferred from a Scrape or Job number. |
| `scraperRunConfiguration` | POST `/api/v1/scrapes` is already implemented generically. Production modules lack approved per-module infoJson schemas and form/serializer configuration. Obtain that workflow contract rather than guessing from sample JSON. |
| `postScraperRunConfiguration` | FB-POSTS-SCRAPER additionally keeps its metadata fields/version policy unresolved and opaque. Existing history/detail/cancel work; its schema/adapter readiness markers do not serialize production metadata. |
| `userLogout`, `adminLogout` | Both logout endpoints exist and acknowledge with null data (§2, §17.3). AuthService still requires true, so frontend contract alignment remains incomplete. Document this defect; Part 26 does not alter the auth lifecycle. |

The legacy `/api/leads/...` expectations in existing Leads/workspace tests are
also frontend fixture drift. The current service uses `/api/v1/Leads/...`; the
contract documents `/api/v1/leads/...`. Six failures were reproduced before this
Part (see [Part 25 verification](./PART_25_ADMIN_FEATURES.md)). Do not reclassify
lead listing, preview or Scrape history as unavailable because of those failures.

## Available external operations are not missing features

- Browser POST `/api/v1/worker/dispatch-messaging` uses cookie authentication and
  no worker key (§7.4.1). It remains a supported browser action.
- Lead/job/account status callbacks and activity-log submission are `worker-only`,
  audience `worker`, and require `x-worker-api-key` (§7.4.2).
- POST `/api/v1/scrapes/{id}/complete` is `worker-only`, audience `webhook`, and
  requires **X-Webhook-Secret** (§8.1.5). It is an external n8n integration, not a
  browser action or a worker-key callback.
- Only ScrapeCompleted, LeadStatusUpdated and JobFailed are emitted (§9). Their
  payloads do not establish progress, delivery guarantees or a Job read API.

Keep credentials and callback clients outside the frontend. Runtime metadata
contains no callback URLs or secrets and cannot authorize any request.

## Updating a blocker

Clear a backend blocker only after the live contract defines the operation,
authentication, DTOs, errors and lifecycle behavior. Then inspect and implement its
frontend consumer in the appropriate task; backend availability alone does not
make an integration complete. Update the matrix, typed metadata and this document
together. Page messages reference the shared status/description rather than adding
independent TODOs. Existing server checks, role guards, ownership and module
configuration remain authoritative regardless of the metadata.
