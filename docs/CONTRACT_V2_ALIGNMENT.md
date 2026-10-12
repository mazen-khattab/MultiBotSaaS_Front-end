# Contract V2 alignment report

Source of truth: FRONTEND_BACKEND_CONTRACT_V2.md. The standard
FRONTEND_BACKEND_CONTRACT.md path now links to that source. V1 is historical.

## Auth/session

User and admin cold-load identity use GET /api/v1/auth/me and
GET /api/v1/admin/auth/me. Healthy reloads do not call refresh. Expired access
cookies still use the coordinated 401 refresh/replay interceptor. Identity stays
in memory and JWTs remain in backend-managed HTTP-only cookies. Logout endpoints
remain unchanged and the backend's corrected refresh-token revocation is documented.
StrictMode and stale action/version protection remain intact. Credential debug
logging was removed from AuthProvider.

## Bots and registry

BotsService and query hooks cover catalog, subscribed bots, and bot detail with
requireOwnership. The workspace loader requests owned BotDto and resolves only
its uiModuleCode. The registry contains FB-MEMBERS-SCRAPER, FB-POSTS-SCRAPER, and
FB-MEMBERS-MESSAGES-SCRAPER. Each exposes the already implemented generic Runs tab.
Catalog/subscription pages have real loading, error, empty, and navigation states.
Unowned, missing, mismatched, and unsupported bots retain appropriate error states.

## Runs

Run history now uses the real paginated endpoint with botId, pageNumber, pageSize,
and statusFilter. Run detail loads on demand. Only Running rows with no endedAt
expose cancellation. Duplicate writes and automatic mutation retries are blocked.
Cancellation refreshes relevant run and eligible-account queries; final Cancelled
status and end time come from the backend. A cancellation error survives list
refetches. Creation also refreshes history and eligibility. Retry remains disabled
and no retry API is called.

## DTOs and eligibility

BotDto and RunDto follow the documented fields; RunStatus includes Cancelled.
Start Run uses the canonical eligible?botId= route and the updated ConnectedAccountDto
with expiredAt. The backend owns eligibility rules. Empty eligible results disable
Start Run; the selected ID must belong to that response. There are no accountStatus
assumptions or all-account eligibility filters.

Parts 1-14 had no account create/update or target-group DTO implementations needing
renaming. No old expiry, cookie-payload, or group-URL contract is retained in src.
Future management integrations should use cookiesPayload and groupUrl as specified
by V2. Full account/group management is not introduced by this patch.

## Removed obsolete blockers

Removed refresh-for-identity bootstrap, the empty production registry, absent bot
retrieval adapter/blocked workspace state, bot-list placeholders, and backend-blocked
run history/detail/cancel capabilities. Documentation and regression tests reflect
these changes. Retry, concrete bot form schemas, admin management, and other
later-part features remain genuinely deferred.

## Validation

- npm run typecheck: passed.
- npm run lint: passed.
- npm test: 142 passed, zero failures.
- npm run build: passed; Vite reports a non-fatal 503 kB main-chunk warning.
- Git whitespace check: passed.

Tests use real frontend services/components with test-only HTTP adapters in JSDOM;
no live backend session was exercised. They cover user/admin login and reload,
healthy and expired /me, subscribed/catalog loading, owned module resolution,
run pagination/filtering/detail/cancellation, cancellation races, Cancelled display,
eligible-account empty/error/recovery states, canonical DTO expiry, and absence of
retry calls. Existing architecture/session/registry/form/table regressions also pass.

## Remaining scope and Part 15 readiness

No known code/contract mismatch remains in the patched Parts 1-14 scope. The
backend contract supplies example infoJson values but no complete bot-specific
schemas; production start forms stay deferred until those feature definitions
are supplied. The reusable create flow is ready for them. The existing local .env
is preserved; .env.example now uses the V2 HTTPS default at localhost:5001. Configure
the local API URL to match the backend actually running on your machine.

The frontend is ready to begin Part 15. Part 15+ bot-specific UI, full connected
account/group management, leads, messaging, and real-time features remain unimplemented.
No commit or pull request was created.

## Modified files
- .env.example
- docs/PART_14_RUNS.md
- docs/auth-session.md
- docs/bot-registry.md
- docs/bot-workspace.md
- docs/data-table.md
- src/app/router/router.tsx
- src/context/auth/AuthProvider.tsx
- src/features/bots/botWorkspace.types.ts
- src/features/bots/components/BotWorkspaceState.tsx
- src/features/bots/loaders/botWorkspaceLoader.ts
- src/features/bots/pages/BotTabRoutePage.tsx
- src/features/client/pages/ClientBotsPage.tsx
- src/features/client/pages/ClientOverviewPage.tsx
- src/features/runs/adapters/createRunAdapter.ts
- src/features/runs/components/StartRunModal.tsx
- src/features/runs/hooks/useCreateRun.ts
- src/features/runs/pages/GenericRunsPage.tsx
- src/features/runs/services/RunsService.ts
- src/features/runs/types/runs.types.ts
- src/layouts/bot/BotWorkspaceLayout.tsx
- src/registry/botModulesRegistry.ts
- src/registry/configs/runsConfig.types.ts
- src/services/auth/AuthService.ts
- src/services/auth/auth.endpoints.ts
- tests/auth.test.mjs
- tests/registry.test.mjs
- tests/runs.test.mjs
- tests/runs.types.fixture.ts
- tests/workspace.test.mjs

## Created files

- docs/CONTRACT_V2_ALIGNMENT.md
- docs/FRONTEND_BACKEND_CONTRACT.md
- src/core/api/readApiData.ts
- src/features/bots/hooks/useBots.ts
- src/features/bots/services/BotsService.ts
- src/features/bots/types/bots.types.ts
- src/features/runs/components/RunActions.tsx
- src/features/runs/components/RunDetailDialog.tsx
- src/features/runs/hooks/useCancelRun.ts
- src/features/runs/hooks/useEligibleAccounts.ts
- src/features/runs/hooks/useRuns.ts
- src/features/runs/pages/RegisteredRunsPage.tsx
- src/features/runs/services/EligibleAccountsService.ts
- src/features/runs/types/runs.schemas.ts
- src/registry/definitions/scraperModules.ts
