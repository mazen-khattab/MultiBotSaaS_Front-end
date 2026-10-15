# Part 27 — Unit, component and integration testing foundation

Part 27 adds Vitest, React Testing Library/user-event, jest-dom and MSW with
jsdom. The existing 264 Node.js regression tests remain in place. New tests run
through real services, interceptors, Auth context, query hooks and components;
MSW replaces HTTP responses without replacing Axios adapters or feature services.

## Commands and layout

| Command | Purpose |
| --- | --- |
| `npm test` | CI command: run Vitest once, then all Node.js regressions. A failure in either suite exits nonzero. |
| `npm run test:vitest` | Run the new suite once. |
| `npm run test:watch` | Watch the new suite during development. |
| `npm run test:legacy` | Run existing Node.js regressions sequentially, avoiding competing Vite HMR test servers. |
| `npm run typecheck` | Strict application, config, helper and integration-test type checks. |
| `npm run lint` | ESLint checks, including new TypeScript tests/helpers. |
| `npm run build` | Type-check projects and build production assets. |

Use `npm ci` from the checked-in lockfile on the project's supported Node version.
The installed stack is Vitest 5.0.5, MSW 3.0.3 and jest-dom 7.0.1, alongside the
existing React Testing Library, user-event and jsdom packages. No global test
runner, real API, credentials or service-worker asset is required.

- [vitest.config.ts](../vitest.config.ts) owns test aliases, jsdom, bounded workers,
  setup and test-only environment values. It selects TypeScript tests under src
  or tests/integration and deliberately excludes the legacy `.mjs` runner files.
- [setup.ts](../src/test/setup.ts) starts/stops MSW, resets handlers, cleans the DOM,
  clears test query caches and resets the auth coordinator between cases.
- [renderWithProviders.tsx](../src/test/renderWithProviders.tsx) supplies MemoryRouter,
  the real AuthProvider and a fresh QueryClientProvider. It returns the render result,
  a user-event instance and the query client. `createTestProviders` supplies the same
  wrapper for renderHook. The pathname is initialized before auth bootstrap.
- [queryClient.ts](../src/test/queryClient.ts) preserves production query defaults
  while disabling retries and retention timers for deterministic tests. Retry tests
  must explicitly exercise the production retry policy. Caches are cleared after
  every test; different renders get different clients by default.
- [fixtures](../src/test/fixtures/api.fixtures.ts) describe backend wire payloads.
  [handlers](../src/test/mocks/handlers.ts) register only existing documented HTTP
  methods and paths. Neither is imported by production application entry points.
- [integration tests](../tests/integration) cover HTTP, auth/guards, Registry,
  forms/tables, DTO adapters, query hooks and real-time cache reconciliation.

The provider helper intentionally omits RealtimeProvider so ordinary component
tests cannot open a hub. It does not bypass role guards or simulate backend
permissions. Existing regressions separately cover the real session-owned
QueryProvider, SignalR connection lifecycle, StrictMode and principal changes.

## HTTP and fixture rules

MSW is enabled only by the Vitest setup. Its v3 `onUnhandledFrame` callback errors
on any unhandled request or connection, records the failure and asserts it during
cleanup, even when a component catches a transport error. There is no wildcard
success, passthrough fallback, fake production persistence or invented endpoint.
Tests use `server.use()` for a scenario and reset to baseline handlers afterward.

Use the shared fixtures for **wire** data, never schema-parser output:

- Account list/detail responses use `expiredAt`; details use `scrapesCount` and a
  documented status. The explicit adapter returns UI `expiresAt` and `runsCount`.
- Group read/write DTOs use `groupUrl`; detail counts arrive as `scrapesCount` and
  explicitly become UI `runsCount`. `groupURL`, `expAt` and wire `runsCount` are
  used only in clearly negative tests that verify rejection.
- Account/group list/detail reads include botId in the route. Both Runs and
  messaging eligibility readers use `/api/v1/connectedaccounts/eligible/{botId}`.
- Logout succeeds with `ApiResponse<string>` and **null data** in both realms;
  historical boolean acknowledgments are rejected.
- JWT challenges and role forbids may have empty bodies. Session failures use
  message-only 401, including `Invalid session token.` and the documented device
  replacement message. Those failures terminate auth without rotating cookies.
- Validation/model binding uses 400; business ErrorType.ValidationError (7) maps
  to 422; role rejection is 403 and is not an ErrorType enum member. Structured
  error fixtures use ApiErrorResponse, not an invented universal auth envelope.
- Only ScrapeCompleted `{ scrapeId, leadsCount }`, LeadStatusUpdated
  `{ leadId, status }` and JobFailed `{ jobId, message }` are positive real-time
  fixtures. No botId/version/progress fields or RunCompleted/runId alias is added.

The jsdom URL and mocked API share the test-only `https://api.test` origin. This
keeps HTTP/component tests focused on request and response contracts. These tests
do **not** establish browser CORS policy, trusted HTTPS, actual HttpOnly/Secure
cookies, real JWT authorization, worker execution or webhook behavior. MSW sees
the real request headers and credentials setting; it does not create a live login.
Browser-level E2E remains outside Part 27.

The retained adapter-based Node tests exercise additional scheduling and UI cases.
They are not claimed as live backend tests. Their HTTP fixtures were aligned with
the same published paths/fields rather than preserving outdated assumptions.

## Priority behavior covered

- Concurrent recoverable user/admin 401s share one realm-specific refresh and replay
  once. Failed refresh rejects queued requests without a loop; a second replayed
  401 ends the session. Login failure, terminal message-only session failures,
  400, bare 403 and business 422 never initiate token refresh.
- Actual AuthProvider bootstrap uses `/me` without unnecessary rotation; login
  and null-acknowledgment logout update both realms. Anonymous guards preserve the
  requested path/query and redirect to the correct login. A User cannot enter
  Admin role-guarded content. Tokens are not persisted in browser storage.
- Registry resolution accepts exact known codes, retains unknown/prototype-like
  codes as unsupported and never resolves invalid or nested tabs by fallback.
- DynamicForm blocks invalid schema input and submits parsed values. DataTable
  emits server page/size intent, retains the supplied rows/totals and disables
  navigation for empty server pages.
- Real query hooks retain bot/page/size/status cache separation and only fetch
  selected group details; adapted DTOs reach the query cache.
- Completion/status/failure handlers invalidate current server-read scopes without
  incrementing counters, patching filtered rows or equating worker Job and Scrape
  IDs. Duplicate completion events do not fabricate state.

## Contract corrections required by the tests

The V2 contract was kept authoritative; fixtures were not weakened to hide these
existing integration mismatches:

1. AuthService now accepts the documented null logout acknowledgment for both
   realms. The capability inventory marks these existing integrations available.
2. Account/group detail adapters accept wire `scrapesCount` and explicitly map to
   the established UI `runsCount`, retaining account expiry transformation.
3. Leads reads and old mocks use canonical `/api/v1/leads/...` routes. This resolves
   the six inherited Leads/workspace failures reported in Parts 25 and 26.
4. Generic Runs eligibility now uses the existing bot-path endpoint, matching the
   messaging reader. The unsupported query-only URL and its old fixtures are gone.
5. `Invalid session token.` is treated as a terminal middleware failure, preserving
   its exact message and preventing a refresh loop.

No new business endpoint, worker callback control, RAG integration, workflow
schema, lead-detail feature or activity-log page was introduced. The source backend
contract and external master-plan files are unchanged.

Implementation references: [Vitest configuration and run mode](https://vitest.dev/guide/)
and [MSW Node test lifecycle](https://mswjs.io/guides/integrations/node). The installed
MSW v3 API/types are used for unhandled-frame enforcement.

## Definition of Done and verification

- [x] Vitest configuration runs with jsdom, isolated files and strict HTTP mocks.
- [x] The provider helper supplies real Auth context, routing, queries and user-event.
- [x] Core auth/interceptor/Registry tests and all other priority areas are covered.
- [x] The non-watch CI command `npm test` succeeds across both suites.

Final checks:

| Check | Result |
| --- | --- |
| `npm test` | **306 passed**: 42 Vitest tests across 7 files, plus all 264 Node.js regressions. Zero failed, skipped or cancelled. |
| `npm run typecheck` | Passed, including strict integration-test types and Vite environment declarations. |
| `npm run lint` | Passed. |
| `npm run build` | Passed; the existing approximately 567 kB main-chunk warning remains nonfatal. |
| `git diff --check` | Passed. |
| Capability/documentation audit | All 52 typed states match their matrix rows and local documentation links resolve. |

Windows sandbox attempts blocked Vite/Node helper processes with `spawn EPERM`;
the permitted reruns completed successfully. The setup uses MSW v3's actual
unhandled-frame API and a test-only same origin rather than claiming to exercise
real browser CORS. No live API, browser E2E, external worker or webhook was run.

Dependency installation reported five high-severity npm advisories. No broad
`npm audit fix` or unrelated dependency migration was applied in this Part; that
installation notice is separate from the passing test/build checks above.
