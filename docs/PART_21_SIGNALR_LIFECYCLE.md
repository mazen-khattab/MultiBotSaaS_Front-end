# Part 21: SignalR connection lifecycle

The application now installs `@microsoft/signalr` and places `RealtimeProvider`
inside AuthProvider, outside the session-keyed QueryProvider. A single inert
`signalRService` owns the app connection. It starts only for an authenticated
principal and uses the existing auth/refresh infrastructure. AppProviders accepts
an optional service for tests so unrelated query tests never open a live hub.

## Configuration and authentication

Set `VITE_API_BASE_URL` and `VITE_SIGNALR_HUB_URL` for the deployed API. The hub URL
must resolve to `/hubs/notifications` on the API origin, without credentials,
query parameters, or fragments. Missing/invalid configuration is exposed as
`Unavailable`, rather than opening a connection to a guessed host. The updated
`.env.example` uses the contract's development HTTPS origin `https://localhost:7062`.
The user's local `.env` is unchanged. The frontend origin must still be allowed
by backend credentialed CORS, as documented in V2 sections 9.1 and 15.

The builder sets `withCredentials: true` and keeps default transport negotiation.
It does not supply an access-token factory, Authorization header, token query
parameter, or JavaScript cookie access. Protocol and payload logging are disabled.
There are no application hub methods, joins, or subscription RPCs.

SignalR HTTP traffic bypasses Axios, so a small HttpClient wrapper delegates to
Microsoft's default browser HTTP transport and observes real HTTP 401 responses
before negotiation errors are wrapped by the SDK:

- An ordinary 401 joins `refreshSession` and the existing refresh coordinator for
  the connection's user/admin realm, then repeats the HTTP request once with the
  renewed cookies. Concurrent Axios and hub failures share the same rotation.
- A delayed 401 from before a completed rotation reuses the newer cookies.
- The documented session-invalidation response stops the connection immediately
  without refresh. Refresh failure or a repeated 401 also ends recovery, through
  the existing auth-expiry notification.
- Network errors, opaque browser WebSocket failures, 403s, and server failures do
  not cause speculative cookie rotation. Transport cleanup DELETEs can finish
  after logout and never trigger refresh.
- Every asynchronous continuation checks connection ownership. Logout or a
  principal switch prevents an old request from replaying or publishing status.

No refresh endpoint, auth state model, or token-storage policy is added.

## Connection ownership and reconnect

Repeated starts for the same principal share an in-flight start and retain the
same connection after cookie rotation or identity display-field updates. A
realm, user, or role change stops the previous connection before another starts.
Repeated stops are safe. Unmount removes handlers and stops the transport;
StrictMode effect replay retains the active owner. Auth expiry is subscribed
directly while a session is active, so successful logout/session failure stops
the hub without depending on a server disconnect or a later React render.
An ordinary failed logout preserves the existing authenticated session, matching
AuthProvider's established behavior.

The builder uses `withAutomaticReconnect()`. Initial start failures produce a
disconnected state and safe error, with an explicit `retry()` API; they do not
enter an unbounded retry loop. The SDK handles dropped established connections,
and its HTTP reconnection traffic uses the same bounded auth recovery. Exhausted
reconnects remain disconnected until an explicit retry. The service does not
know React Router and does not redirect.

These decisions follow the official [JavaScript client reconnect documentation](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0#reconnect-clients)
and [cookie authentication/lifetime documentation](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-10.0),
along with the installed SDK's HttpClient and connection lifecycle interfaces.

## Feature boundary

`useRealtime()` provides `status`, a safe `error`, `retry()`, and
`subscribe(event, handler)`. Subscribe in a feature effect and return its
unsubscribe function. Local subscribers are scoped to the authenticated
principal; obsolete connection callbacks and handlers cannot reach another
session. One failing event consumer does not interrupt others.

`signalr.events.ts` allowlists only `ScrapeCompleted`, `LeadStatusUpdated`, and
`JobFailed`. Argument types remain unknown here. The payload definitions and
feature event bridge are deferred to Part 22. No feature cache mutations,
notifications, replay claims, counters, or missed-event recovery are implemented.

## Definition of Done

- [x] One authenticated app connection with idempotent start/stop and provider cleanup.
- [x] Automatic reconnect is configured; initial start failure has explicit handling.
- [x] Successful logout/session failure stops the connection and stale recovery work.
- [x] Cookie-only auth reuses the existing realm-aware refresh flow.

## Verification

The focused realtime/auth/query run passed all 64 tests, including 13 new realtime
tests. They cover actual SDK handshake/reconnect with a test-only in-memory HTTP
transport, a 401 during reconnect, shared Axios/hub refresh, admin realm selection,
delayed 401s, invalidation/refresh failures, logout during start/refresh, principal
changes, StrictMode, subscription cleanup, and invalid configuration. No live
backend is contacted by these tests.

Typecheck and lint passed. The first production build hit sandbox `spawn EPERM`;
the approved rerun passed. The main build chunk is approximately 563 kB after
adding the SignalR client. Git whitespace checks passed.

The final full suite (`npm test -- --test-concurrency=1`) ran 222 tests: 216
passed and 6 failed. All realtime/auth/query tests passed. The remaining failures
are the same five inherited Leads route assertions and the Leads/messaging
workspace regression: their fixtures still expect `/api/leads`, while the service
uses `/api/v1/Leads` and the current contract documents versioned `/api/v1/leads`
routes. Part 21 preserves that separate implementation. Full-suite verification
remains unresolved; these results are not a clean full-suite pass.

The existing lazy sign-in route integration test now uses the same bounded
five-second cold-compilation allowance as workspace tests. Its one-second default
timed out in the first full run; the final run passed that test. No auth behavior
or route expectation was relaxed.

Live authenticated hub traffic, deployed cookie/CORS settings, and browser
WebSocket/SSE behavior have not been exercised against a backend. External plan
documents are unchanged; no PR is created.
