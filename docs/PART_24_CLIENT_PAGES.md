# Part 24: Client overview, bots catalog, and settings

Implemented the selected Part_24.md using current backend contract sections 6
and 10. Existing client routes, layout, and page composition are retained.
Pending Part 23 work and the user's contract edit were preserved.

## Client surfaces

- Overview reuses `useBots` and its existing catalog query. The available-bot
  count is the length of the complete, unpaginated server catalog. Loading and
  errors remain explicit; an empty successful catalog displays zero. Workflow
  and daily-run aggregates remain unavailable, with no fabricated numbers or
  aggregate service. The existing summary cards and supporting section remain.
- My bots retains the existing independent catalog/subscribed queries and
  subscription-based workspace links. Cards distinguish bot lifecycle from
  assignment presence. Inactive assigned bots remain visible as returned by the
  backend; unknown module codes keep using the workspace's unsupported-module
  handling. Purchasing bots and changing subscriptions are explicitly unavailable
  on this client surface. No Admin assignment API is called.
- Settings now loads and saves through `GET`/`PUT /api/v1/settings`. The editor is
  mounted only for an authenticated User. Identity remains in Auth Context; the
  current-user Settings cache is owned by the existing session Query provider.
- `BackendCapabilityNotice` explains specific unavailable operations without
  claiming that the working catalog or Settings APIs are absent. DTOs, request
  validation, and notice props live in `features/client/types/client.types.ts`.

## Settings contract and credential handling

- GET validates `UserSettingsDto` and allowlists presence flags, masked values,
  daily limit, and nullable company information. Unknown raw/security fields are
  discarded before data enters Query. No-record values come from the backend;
  no application default of 30 or 50 is introduced.
- PUT always supplies a nonnegative Int32 `dailyLeadLimit`, including zero.
  Company names are limited to 100 characters and company text is not trimmed.
  Untouched company fields are omitted, preserving existing values and nulls;
  explicitly emptied company inputs send empty strings to clear them.
- GET masks are display-only and never become replacement input values. Blank,
  whitespace-only, or null credentials are omitted from the outgoing request.
  Nonblank replacements retain their supplied value. Credential deletion remains
  unavailable under the current contract.
- Saving requires an HTTPS API connection and uses the shared cookie-authenticated
  Axios client and refresh coordinator. The request accepts no user ID, internal
  fields, manual token, or worker key.
- The PUT result is validated as a GUID acknowledgment, not a settings DTO. After
  success, active Settings reads refetch the current masks and saved information.
  Leads/preview reads are invalidated so existing server quota remains authoritative.
  Submitted values never replace the server read cache optimistically.
- Replacement inputs clear before the request settles. Replacements stay out of
  mutation variables/results and Query caches. Retained Axios bodies are scrubbed
  on response/failure; write errors use fixed messages without echoed credentials
  or raw transport references. Failed writes require explicit retry and credential
  re-entry. Duplicate form submissions and mutation submissions are locked.
- Failed reads expose retry without an editor populated from stale data. A failed
  refetch after an acknowledged PUT remains a read error, rather than claiming
  that locally submitted fields are a confirmed current server response. Existing
  session cache replacement protects a new principal from a late old save result.

## Definition of Done assessment

- Client pages reflect available backend capabilities: catalog/subscriptions are
  real reads, Settings has real load/save/refetch, and identity comes from Auth.
- Unavailable aggregate metrics, self-service purchasing/subscription changes,
  and credential deletion have explicit explanations.
- No new backend endpoint, local persistence, fake subscription list, or invented
  aggregate query was added. External plan documents and later parts were untouched.

## Validation

Tests exercise the production services, hooks and pages with a test-owned Axios
transport in JSDOM. They cover exact DTOs/routes and cookie flags, GUID validation,
zero/null/blank semantics, input validation, secret handling, duplicate submits,
read/write/refetch failure, quota invalidation, principal changes, overview counts,
and lifecycle/assignment distinctions. This is not a live backend, worker, or
browser cookie/CORS deployment test.

Final checks:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test --test-concurrency=1 tests/client.test.mjs`: 14 passed.
- `npm run build`: passed; existing main-chunk size warning remains (566.22 kB).
- `npm test -- --test-concurrency=1`: 249 tests, 243 passed, 6 failed. All client
  tests and the updated query-key domain/isolation test passed.
- `git -c core.safecrlf=false diff --check`: passed.

The full suite still fails five tests in `tests/leads.test.mjs` and the
Leads/messaging navigation test in `tests/workspace.test.mjs`. These are the
inherited `/api/leads` expectations; the existing service uses `/api/v1/Leads`,
and the current contract documents versioned Leads routes. Those unrelated
expectations were not changed or hidden. Overall repository verification remains
limited by these six failures.

One redirected test attempt was blocked by Windows `spawn EPERM`; rerunning it
outside the sandbox produced the final results above. No commit or PR was created.
