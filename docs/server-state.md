# Server cache foundation (Part 9)

API data belongs in TanStack Query. Auth Context keeps identity/session state and
auth actions; component state keeps local modal/filter state. Do not copy queried
API data into Auth Context or add another store for it. No Zustand or feature
endpoints are introduced by this part.

`AppProviders` installs the application error boundary, AuthProvider,
QueryProvider, and the existing TooltipProvider. Features use `useQuery`,
`useMutation`, and `useQueryClient` inside that tree, alongside the existing
central API/services.

## Cache ownership and keys

The client stays stable while the authenticated realm, user ID, and role stay
the same. A login, logout, principal switch, or role change replaces the provider
before the new session can render cached data. Disposal clears the previous
client's queries/mutations and cancels active queries; query functions must pass
TanStack's AbortSignal to the central API to abort their underlying HTTP request.
Identity name/email changes and normal token rotation retain the cache.

`queryKeys` supplies factory-style `all`, `lists`, `list(filters)`, `details`, and
`detail(id)` keys for accounts, groups, runs, leads, bots, and admin. Include
relevant feature scopes and filters in a list key. Use prefixes for invalidation
and full keys for individual results. These factories only name cache entries;
they do not imply backend endpoints or implement blocked features.

## Retry and error policy

Queries retry network failures and HTTP 5xx at most twice (three total attempts),
with bounded exponential delay. Query never retries HTTP 401 or other 4xx; the
Axios/Auth layer owns refresh and session expiry. Cancelled and unknown failures
are not retried. Raw HTTP status is consulted internally when a bare 5xx payload
has been normalized to an unknown error. Window-focus refetch is disabled; each
feature can choose its stale time and refetch options later.

Mutations do not retry automatically because the backend has no idempotency-key
contract. Query/mutation errors remain local by default. Use `ApiErrorAlert`
with the feature's error, optional explicit retry callback, and local pending
state. It displays only the normalized message, including in development;
`details`, `innerException`, raw requests, and JavaScript stack traces are never
rendered. Route errors use the same presentation. `AppErrorBoundary` provides a
generic fallback for unexpected render failures, with retry/reload actions that
work without the router or other providers.

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` to validate
the foundation. Query/UX tests use test-only cache entries, transport adapters,
and a DOM environment; no future features or production mock data are added.
