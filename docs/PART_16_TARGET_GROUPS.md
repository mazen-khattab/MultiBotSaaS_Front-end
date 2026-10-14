# Part 16: Target groups

The three registered scraper modules expose a lazy `groups` tab. It uses the
shared Axios, Query, DataTable, DynamicForm, and dialog infrastructure for
create, list, detail, update, and delete. Details load on demand, and edits and
deletion wait for a fresh detail response. Deletion requires confirmation.
Changing workspaces discards open dialogs and unsubmitted forms. Loading,
empty, retry, write-error, and success states are available.

## Current contract and historical specification

`docs/FRONTEND_BACKEND_CONTRACT.md` explicitly points to V2 as the source of
truth. Section 7.2 supersedes these historical details in external `Part_16.md`:

- Both list and detail use `groupUrl`. The adapters keep one internal name and
  strip undocumented properties; the obsolete detail spelling `groupURL` is
  not accepted as a replacement for the required V2 property.
- V2 documents `[Authorize]` for group reads and requires authorization for
  client dashboard endpoints. The historical missing-authorization caveat is
  no longer a documented blocker in the live contract. All requests use the
  shared credentialed Axios instance. Frontend route guards cannot replace
  backend authentication, ownership validation, or access enforcement.
- Create/update response data is not specified by V2. The service validates
  the standard success envelope and discards data, including any historical
  UserId. It never uses that value as a GroupId, fetches its details, navigates
  to it, or populates a detail cache from it. Delete follows V2's boolean
  contract and succeeds only on `data: true`.

Create sends `botId`, `groupName`, `groupUrl`, `configJson`, and `isActive`.
Update sends the four mutable fields without botId, counts, or a body ID.
Details contain configuration, activation, related-lead count, and run count.
The form validates a nonempty name, HTTP/HTTPS URL, and serialized JSON syntax.
No bot-specific configuration schema, URL domain rule, or business validation
is invented; the backend owns those rules. Configuration must be entered
explicitly. Unsafe server URL schemes remain readable text without a link.

## Bot-scoped reads

The user's endpoint update on 2026-10-14 resolves the previous list-scoping
limitation. List reads use `GET /api/v1/TargetGroups/{botId}` and details use
`GET /api/v1/TargetGroups/{botId}/{id}`. These are path parameters, matching
the supplied routes. The backend scopes the results; no local bot filter or
detail fan-out is needed. The page displays the groups for its current bot.
List and detail query keys both include botId, so changing workspaces cannot
reuse another bot's cached results. Creation continues to supply botId in the
body, while update/delete retain their existing routes and payloads.

## Cache and write behavior

Create/update/delete reconcile every group list and detail through the groups
query prefix. Reconciliation also runs after a failed response, since a write
may have been applied before its response was lost. Successful deletion removes
the selected group's details across all bot-scoped caches; unrelated details
remain. The ID-only detail key is used as the deletion prefix. Mutation
response data never enters the read cache. Automatic write retries and rapid
duplicate submissions are blocked, and dialogs cannot be dismissed while saving.
Read requests receive Query's abort signal. Other feature caches are preserved.

## Definition of Done and validation

- [x] Complete CRUD service, hooks, table, form, dialogs, and workspace routing.
- [x] URL casing aligned with the live V2 contract in adapters and write DTOs.
- [x] Mutation reconciliation without assuming returned UserId is GroupId.
- [x] Historical security caveat and bot-scoped read routes documented.

Regression tests exercise the actual service, hooks, page, registry, and workspace
route with test-only HTTP adapters. They cover exact routes/payloads, credential
auth, abort signals, response validation, cache reconciliation, duplicate writes,
fresh edit defaults, confirmation, failed writes, retry states, URL safety, JSON
validation, bot-scoped reads/cache isolation, and switching workspace context.

`npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`
passed. The full suite (`npm test -- --test-concurrency=1`) passed all 178 tests,
including 14 new groups tests and the new application route regression. The first
full-suite attempt was blocked by sandbox `spawn EPERM`; the approved rerun
passed. Test servers emitted non-fatal HMR port warnings. The build retains the
existing approximately 503 kB main-chunk warning; groups are loaded separately.

Live backend authentication and CRUD have not been exercised; tests validate the
frontend against the repository contract. Leads, messaging, and run configuration
remain outside Part 16. External plan files are unchanged.

### Bot-scoped endpoint follow-up validation

Typecheck, lint, build, and Git whitespace checks passed after the endpoint
update. All 15 group tests, 19 shared query tests, and the isolated group workspace
route regression passed, covering separate list/detail caches per bot and
deletion cleanup across bot scopes.

The broader workspace run had one separate Leads navigation failure: the current
LeadsService prefix is `/api/v1/Leads`, while that test fixture still expects
`/api/leads`. That existing service change is preserved; this update only changes
target-group read routes and their integration. Live backend CRUD is not tested.
