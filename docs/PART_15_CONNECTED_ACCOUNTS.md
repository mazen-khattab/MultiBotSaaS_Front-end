# Part 15: Connected accounts

The connected-accounts tab is registered lazily for the three existing scraper
modules. The feature uses the shared Axios and Query infrastructure for real
create, list, detail, update, and delete requests. The table shows the complete
bot-scoped account list through the existing service, with loading, retry, and
empty states. Details are fetched on
demand; editing uses fresh details and deletion requires explicit confirmation.
Successful and failed writes reconcile account lists, details, and the existing
run-eligibility queries. Deleted details are removed from the cache.

## Contract alignment

`docs/FRONTEND_BACKEND_CONTRACT.md` points to V2. This supersedes the historical
names in the external Part 15 specification: both list and detail now expose
`expiredAt`, normalized internally to `expiresAt`. Both create and update send
plaintext `cookiesPayload`; the frontend never encrypts it or sends the obsolete
`cookies`/`encryptedCookies` fields. Create includes the workspace's numeric
`botId`, `displayName`, and `platform`. Update includes `displayName`,
`cookiesPayload`, `platform`, `status`, and `isActive`, following the updated V2
write contract. The edit form offers the five documented AccountStatus values;
the backend validates permitted transitions. Status is separate from activation.
When details return a status, it initializes the dropdown. If omitted, the form
requires an explicit selection rather than inventing a current status.

The contract supplies no create/update response data shape, so the service checks
the standard success envelope, discards its data, and refetches reads. Update
requires replacement cookies because V2 does not define omitted/empty cookies as
“keep existing cookies.” Platform has no published enum or cookie validation
schema: the form requires nonempty values and leaves business validation to the
backend. A JSON cookie array can be pasted as the documented serialized payload.

## Sensitive input handling

Cookies use an uncontrolled password input, without defaults, React Hook Form
state, persistence, or Query variables/results. The input is cleared immediately
on a validated submit, including failed requests; retry requires re-entry. Closing
the form or changing workspaces removes unsubmitted input. While saving, dismissal
and duplicate submission are blocked. A short-lived ref transfers cookies to the
HTTP operation and is cleared when the operation begins and in its finalizer.
Only the request retains the payload while it is in flight. The API destination
must resolve to HTTPS before either cookie write can run. Existing `.env` is not
changed; configure `VITE_API_BASE_URL` to the actual HTTPS backend address.

Request bodies and raw transport errors are never logged. The shared API debug
logs were removed to enforce that boundary. Write responses do not enter caches,
and their retained Axios body is cleared. Write errors expose fixed messages
and status codes, without server text that might echo cookies or raw error links.
Read schemas strip undocumented fields. Details display only backend-provided
`maskedCookies`; full cookies are never fetched or displayed after submission.

## Remaining backend limitations

- V2 still documents management reads without bot scoping. The existing service
  uses `/connectedaccounts/{botId}` and `/connectedaccounts/{botId}/{id}`; those
  pre-existing routes are preserved by this status patch and must match the
  deployed backend. No local filtering or per-account detail fan-out is used.
- The detail response example still omits execution `status`, although updates
  now accept it. The detail adapter preserves a known status when present and
  supports the documented response without it. `isActive` remains Enabled/Disabled
  and is never mapped to Active/Busy or inferred eligibility. The existing
  `/connectedaccounts/eligible?botId=...` read remains the server authority for
  Start Run.

Target groups, run configuration, and other later-part features remain deferred.

## Verification and Definition of Done

- [x] CRUD service and hooks: exercised through test-only HTTP adapters, the
  real page, and the application workspace route. Includes cache reconciliation,
  delete confirmation, error recovery, duplicate writes, and fresh edit details.
- [x] DTO normalization: V2 expiry reads become `expiresAt`; writes use exact
  V2 fields, and unexpected response properties are removed before caching.
- [x] Sensitive inputs are not persisted: coverage checks cleared password
  inputs, pending mutation variables, safe errors, request logs, HTTPS refusal,
  dialog reopening, and changing bot context.
- [x] Editing preserves a returned execution status and requires a selection
  when it is absent, without deriving status from activation. Successful deletion
  removes all bot-scoped detail caches for that account; other accounts remain.

`npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`
passed. The final full-suite run (`npm test -- --test-concurrency=1`) passed
all 163 tests, including 20 connected-account tests and the route regression.
Runs under concurrent compiler/linter load encountered existing lazy-page
timeouts; the final suite ran successfully after those checks finished. Vite
test servers emitted non-fatal HMR port warnings. The production build retains
the existing approximately 503 kB main-chunk warning.

Tests use JSDOM and HTTP adapters, not a live authenticated backend. Production
requests use the real documented endpoints; backend availability and platform
cookie acceptance still depend on the running API.
