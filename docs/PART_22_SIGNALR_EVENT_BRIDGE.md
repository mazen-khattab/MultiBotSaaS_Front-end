# Part 22: Typed SignalR event bridge

The existing cookie-authenticated connection now delivers validated event
payloads to feature handlers. `RealtimeEventBridge` is mounted inside the
session-owned QueryProvider and outside individual pages. The hub service and
RealtimeProvider retain their connection/auth responsibilities and contain no
feature-cache decisions.

## Event contracts

`signalr.types.ts` defines the exact readonly payloads from V2 sections 9.2–9.3:

| Event | Payload |
| --- | --- |
| `ScrapeCompleted` | `scrapeId: number`, `leadsCount: number` |
| `LeadStatusUpdated` | `leadId: number`, `status: "Pending" \| "Completed" \| "Failed"` |
| `JobFailed` | `jobId: number`, `message: string` |

`signalr.events.ts` retains only these three case-sensitive names and validates
the single payload object before a subscriber is called. IDs must be positive
safe integers; completion counts must be nonnegative integers, including zero.
Malformed argument counts, missing/wrong fields, unsafe IDs, and undocumented
lead statuses are ignored. Additional object fields are stripped, including any
unexpected bot/account fields. Payloads are not logged or persisted by the core.

`subscribe(event, handler)` preserves the relationship between the chosen name
and its payload type. Wire callbacks remain unknown internally. Both synchronous
consumer exceptions and rejected consumer promises are isolated so another
subscriber still receives the event.

## Feature decisions

| Feature handler | Existing cache scopes invalidated |
| --- | --- |
| Runs on `ScrapeCompleted` | Run lists, that scrape's detail prefix, accounts including eligibility, and group details. |
| Leads on `ScrapeCompleted` | Lead reads, including lists and the separate messaging quota preview. |
| Leads on `LeadStatusUpdated` | Lead reads, including all cached pages/filters and quota previews. |
| Jobs on `JobFailed` | Existing Leads/accounts read scopes used by messaging dispatch. |

These payloads do not supply bot/account IDs or entity versions. The handlers
choose conservative invalidation instead of guessing the current workspace or
patching filtered/paginated rows. Existing active queries refetch through their
own services, retaining their bot, pagination, and filters; inactive reads are
marked stale. No new endpoints, DTOs, keys for fictional Job reads, or writes are
introduced.

`leadsCount` describes new leads saved by one completion and is never added to a
cached total. Run status/end timestamps, lead list membership, and quota totals
come from server reads. Duplicate notifications can cause another invalidation
but cannot increment local counters or invent fresh data.

`JobFailed.jobId` identifies a worker Job and is never used as a scrape/run ID,
even when numeric values collide. The current watchdog emitter does not cover
every failure path. There is no browser Job read API, so this handler reconciles
the same existing read scopes as messaging dispatch, without manufacturing a Job
record or changing a scrape's status. No new toast, progress indicator, delivery
claim, or other realtime UX is added.

## Subscription ownership

The bridge subscribes only while authenticated. It registers one callback for
each supported event and removes all three on unmount or session/cache changes.
Captured callbacks also check their effect's lifetime. The existing service
continues to scope delivery by realm/user/role and ignore obsolete connections.
StrictMode replay leaves one active set of subscriptions. Token refresh for the
same principal keeps the existing connection and subscriptions.

The bridge does not react to connection-state changes. Reconnect reconciliation,
missed-event recovery, and any additional resilience behavior remain deferred to
Part 23. No future plan file is read or implemented for this change.

## Definition of Done

- [x] Only the three documented event types are registered and validated.
- [x] Runs, Leads, and Jobs own their event handling decisions.
- [x] Subscriptions clean up through unmount, StrictMode, and principal changes.
- [x] No invented events or realtime UX are exposed.

## Verification

All 21 focused realtime tests passed, including 8 new event/schema/bridge checks.
They exercise the real service and app-provider bridge with test-only transport:
payload rejection/allowlisting, exact event types, consumer failure isolation,
two-bot cache scopes, duplicate completions, numeric Job/run collisions,
subscription disposal, and live Query observers refetching real feature services
with their original bot, pagination, and filters. The strict TypeScript fixture
rejects aliases, case changes, incompatible callbacks, undocumented fields, and
unsupported lead statuses.

Typecheck, lint, and Git whitespace checks passed. The full suite ran 230 tests:
224 passed and 6 failed. The remaining failures are the same five inherited
Leads route assertions and the Leads/messaging workspace regression: fixtures
still expect `/api/leads`, while the service uses `/api/v1/Leads` and the current
contract documents versioned routes. Part 22 leaves that separate integration
unchanged; full-suite verification remains unresolved.

The initial build hit sandbox `spawn EPERM`; its approved rerun passed. The main
build chunk is approximately 565 kB. Test servers emitted non-fatal HMR port
warnings. Live backend event delivery has not been exercised. External plan
files are unchanged; no PR is created.
