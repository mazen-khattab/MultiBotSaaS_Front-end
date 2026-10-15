# Part 23: Realtime cache synchronization and resilience

Implemented against Part_23.md and the current backend contract, especially
sections 7.3, 8.1.2, and 9.4. No external plan document was changed.

## Recovery behavior

- Each connection session retains a recovery counter. Successful automatic
  reconnect consumes a recorded connection gap once. Manual start after a failed
  initial connection or exhausted reconnect also records successful recovery.
  An ordinary initial connection does not invalidate the cache again.
- The counter survives React batching of Reconnecting and Connected. Duplicate
  reconnected callbacks do not increase it. Several recoveries batched into one
  render require one read of current server state rather than event replay.
- `core/realtime/reconnectPolicy.ts` consumes each recovery version once for the
  current Query client. It invalidates Leads (including messaging preview), Runs
  lists/details, accounts (including eligibility), and group details. Only active
  queries refetch immediately; inactive entries become stale for their next use.
  Disabled queries stay disabled. Unrelated bot/catalog and admin reads are left
  alone, and no worker Job cache/service is fabricated.
- Existing query functions retain their own positive bot IDs, pagination, page
  size, and status filters. Run history still uses RunsService and
  `GET /api/v1/scrapes`; the policy does not issue a global history request or
  construct new requests from the currently open workspace.
- Snapshots are checked against the requesting principal before rendering, so a
  new session cannot consume the previous principal's recovery marker. Query
  client disposal and existing subscription guards isolate logout, unmount, and
  principal changes. Ordinary same-principal identity updates retain the cache.
- Failed reads preserve the last server response and expose the existing query
  error/retry behavior. They do not mark a backend job failed or start an
  authentication loop.

## Event and UI behavior

Part 22's feature handlers remain conservative invalidations. Duplicate
`ScrapeCompleted` events never increment cached counters, and late
`LeadStatusUpdated` events never overwrite authoritative filtered lists or quota.
No event history, timestamp/version inference, replay cursor, or cumulative
business state is stored in Context. Worker Job IDs remain distinct from run IDs.

The shared dashboard shell now displays a small connection notice while live
updates are connecting, reconnecting, unavailable, or disconnected. It explicitly
explains that backend jobs run independently of the browser connection. A stopped
connection offers manual retry; connecting/reconnecting states avoid competing
retry controls. The notice disappears on connection and does not interpret a
`JobFailed` notification as a transport failure.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test --test-concurrency=1 tests/realtime.test.mjs`: 26 passed.
- `npm run build`: passed; existing main-chunk size warning remains (565.93 kB).
- `npm test -- --test-concurrency=1`: 235 tests, 229 passed, 6 failed.
- `git -c core.safecrlf=false diff --check`: passed.

The five added regression tests cover recovery markers and obsolete callbacks,
active/inactive/disabled query scopes, recovery read failure and normal retry,
StrictMode/session cleanup, and connection notice/manual retry behavior. The
mounted-app test additionally misses events during a batched disconnect/reconnect,
then reads current run counts, lead membership, and preview quota through the
real feature hooks/services while preserving their query parameters. It also
checks that a late Pending event cannot regress server state. The existing real
Microsoft SDK transport test verifies that automatic reconnect advances recovery.

All six full-suite failures are inherited Leads route expectations: five in
`tests/leads.test.mjs` and the Leads/messaging workspace navigation case in
`tests/workspace.test.mjs`. Those tests still expect `/api/leads`, while the
current service requests `/api/v1/Leads` and the current contract documents the
versioned Leads routes. Their failure remains visible; the full suite is not
green.

Tests use JSDOM and test-owned HTTP/transport adapters, not a live backend or
browser cookie/CORS deployment. The inherited generic Runs eligibility reader
also still uses the query-only `/api/v1/connectedaccounts/eligible` request;
contract sections 7.1.1 and 17.3 document the bot-path route instead. The separate
bot-path eligibility reader already exists. Part 23 preserves those existing
services and does not certify that unrelated integration drift as resolved.

## Definition of Done assessment

- Deterministic reconnect recovery: implemented and covered for automatic
  recovery, manual retry, batched callbacks, duplicate callbacks, and session
  cleanup.
- Duplicate and out-of-order events: covered with invalidation and authoritative
  server reads, without cumulative counters or freshness guesses.
- Browser disconnect versus backend job failure: distinguished in the dashboard
  notice and tested independently of `JobFailed`.
- Required checks were run. Overall repository verification remains limited by
  the six inherited test failures and the live-integration limits above.

No new endpoint, replay/resume mechanism, progress event, or worker Job read API
was introduced. No commit or PR was created, and no later plan part was read or
implemented.
