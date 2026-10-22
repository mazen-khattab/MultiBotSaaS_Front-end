# Part 17: Leads and messaging preview

The implemented flow follows the user's approved clarification on 2026-10-14.
Existing scraper workspaces expose Leads and Available leads pages. The Leads
page fetches the current user's bot-specific leads with server pagination.
Applying any status string filters through the backend and resets the page to
one; clearing the filter or changing page size also resets pagination. Entering
filter text does not trigger requests until Apply. No client search, sort,
export, or worker callback controls are exposed.

Clicking a row in Leads or Available leads navigates to
`/dashboard/bots/{botId}/leads/{leadId}`. The detail page fetches
`GET /api/v1/Leads/{leadId}` instead of using a list-row snapshot. Its fixed DTO
contains `id`, `botId`, `groupId`, `accountId`, `scrapeId`, `externalId`,
`profileName`, `profileUrl`, `aiMessage`, `status`, `createdAt`, `processedAt`,
and `metadataJson`. The returned lead and bot IDs must match the current route.

Metadata is parsed independently and displayed by its actual keys, including
renamed keys such as `relativePosts`. Nested objects, arrays, zero, booleans, and
null values are supported. Long text retains line breaks and uses automatic
text direction for Arabic. Empty metadata has an empty state; malformed JSON
falls back to readable original text without hiding the fixed detail fields.
Profile links remain restricted to HTTP/HTTPS, and metadata is rendered as text.
Direct links, loading, retry, and return navigation to the originating list are supported.

The detail page's **Remove lead** button opens a confirmation. Confirming calls
`DELETE /api/v1/Leads/RemoveLead/{leadId}` with session cookies and no body or
query parameters. Pending requests disable confirmation and cancellation; writes
are not automatically retried. A successful API envelope (unless `data` is false)
or HTTP 204 acknowledges removal. Other responses retain the detail and show an
error for explicit retry. After acknowledgment, cached details for that lead are
removed, lists and the current bot's messaging preview are invalidated, and the
user returns to the originating list with a success notice.

Available leads navigates to a separate workspace page with the backend's
messaging quota and recipient list. Send message opens an account-selection
modal and fetches eligible accounts. Send submits all lead IDs from the current
preview and the explicitly selected eligible account. The result displays the
backend's job ID, status, and accepted count; it does not claim delivery.

## Source of truth and response clarification

`FRONTEND_BACKEND_CONTRACT.md` points to V2. Section 7.3 originally names an
undefined LeadDto and describes preview as a plain list. The user supplied these
current DTOs and approved the quota-based flow in this implementation session:

- `LeadListDto`: `leadId` (Int64), `leadFormattedId`, `profileName`, `profileUrl`,
  `aiMessage`, `fromGroup`, `status` (strings), and `createdAt` (UTC DateTime).
- `MessagingPreviewResponseDto`: `dailyMessageLimit`, `messagesSent`,
  `allowedToProcessCount` (integers), and `leads` (MessagingPreviewLeadDto list).
- `MessagingPreviewLeadDto`: `leadId` (Int64), `leadNumber`, `profileName`,
  `profileUrl`, `aiMessage`, and `status` (strings).

JSON uses camelCase, consistent with the shared API contract. All supplied
strings are nonnullable. Display identifiers are used as supplied, never
constructed or substituted for numeric lead IDs. Runtime schemas allowlist the
two different row shapes and keep their Query caches separate. Int64 IDs outside
JavaScript's safe integer range are rejected rather than silently rounded.

The clarified endpoints are:

- List: `GET /api/v1/leads/leads/{botId}`, with `pageNumber`, `pageSize`, and optional
  `statusFilter` query parameters. The cache key includes botId and every parameter.
- Detail: `GET /api/v1/Leads/{leadId}`. Details are cached separately by bot and lead ID.
- Removal: `DELETE /api/v1/Leads/RemoveLead/{leadId}`, after confirmation on the detail page.
- Preview: `GET /api/v1/leads/bot/messaging-preview/{botId}`.
- Account picker: `GET /api/v1/connectedaccounts/eligible/messaging/{botId}`.
- Dispatch: `POST /api/v1/worker/dispatch-messaging`, with only `botId`, `accountId`,
  and numeric `leadIds`. V2 defines the acknowledgment as `jobId`, `status`, and
  `totalLeadsCount`.

The pre-existing user edit to V2's status-filter examples is preserved. V2 itself
is not modified by this feature; the clarification is recorded here rather than
silently rewriting the user's contract. No finite lead-status enum is invented.

## Quota, eligibility, and request handling

Quota values come directly from preview. They are not recomputed from list totals,
settings, current-page rows, or successful HTTP submission. Zero allowance, an
empty preview, a preview error, or an in-flight preview read blocks sending.
Opening the picker refreshes preview and account eligibility; cached accounts
cannot enable sending before the modal's fresh read finishes. Account reads are
not made when the user merely opens Leads or Available leads.

The shared DynamicModal/DynamicForm handle accessible account selection, inline
validation, empty/error/retry states, duplicate-submit prevention, and pending
dismissal locks. Submission checks the current query data again after form
validation, validates membership in the eligible-account response, and uses the
current preview recipients. No account eligibility is inferred from activation
or locally evaluated status/expiry rules. A failed dispatch retains its error and
selection and never retries automatically.

Dispatch reconciles lead lists, quota previews, and connected-account caches on
both success and failure because a response may be lost after a job is accepted.
No optimistic message status, quota decrement, job record, or delivery success is
invented. Changing bots resets filters, dialogs, and acknowledgments. Late results
cannot acknowledge a dispatch in another workspace.

Requests reuse cookie authentication, coordinated session refresh, and abortable
reads. The dispatch endpoint is explicitly authorized for browser users; no
`x-worker-api-key`, webhook secret, or worker status/log callback is used. Backend
authorization and ownership enforcement remain mandatory; frontend guards are
not a security boundary.

Profile URLs become links only for HTTP/HTTPS schemes. All names/messages remain
React text. UTC timestamps stay unchanged in caches and are formatted only for
display; suffixless backend timestamps are interpreted as UTC.

## Definition of Done

- [x] Server pagination with backend totals and page-size changes.
- [x] Free-form backend status filter with page reset and clearing.
- [x] Mixed route prefixes handled explicitly in LeadsService.
- [x] Messaging preview reflects server quota and blocks unavailable dispatch.
- [x] Only user-initiated messaging dispatch is exposed; worker-only actions remain absent.

Registry changes only wire these two pages into the existing modules for the
approved navigation flow. No new module definition or broader Part 18 bot-specific
configuration is implemented. Existing Runs and account/group behavior is preserved.

## Verification boundary

Tests use real frontend modules and test-only HTTP adapters in JSDOM. They cover
DTO validation, exact routes and payloads, credentials, server filtering and
pagination, UTC presentation, safe profile rendering, cache separation, quota
blocking, fresh account reads, failed-read recovery, selection validation,
duplicate writes, reconciliation, navigation, and late responses after changing
bots. Live authenticated backend dispatch and actual message delivery have not
been exercised. External plan files are unchanged; no PR is created.

Final checks passed: `npm run typecheck`, `npm run lint`, `npm run build`, and
`git diff --check`. The full suite (`npm test -- --test-concurrency=1`) passed
all 200 tests, including 21 new leads/messaging tests and the complete application
navigation/account-picker/dispatch regression. Non-fatal Vite test HMR-port
warnings and the existing approximately 503 kB main-chunk build warning remain.
