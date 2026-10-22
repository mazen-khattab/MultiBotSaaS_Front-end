# Generic Runs integration

The Part 14 architecture now consumes FRONTEND_BACKEND_CONTRACT_V2.md.
RunsPageConfig defines dynamic forms, module-owned selection and metadata adapters,
RunDto table columns, and capability flags. All three backend module codes expose
the generic Runs tab without introducing Part 15 forms or features.

RunsService uses the shared cookie client for create, paginated list, detail, and
cancel. It validates success envelopes and documented DTOs. List requests/cache
keys include botId, pageNumber, pageSize, and statusFilter. Detail is fetched on
demand. The existing DataTable renders actual server rows and totals; filter and
page-size changes reset pagination to page one. No unsupported sorting or search
parameter is sent.

Cancel appears only for Running rows with no end time. Duplicate writes and
automatic mutation retries are prevented. Cancellation settlement invalidates
run lists, selected detail, and account queries. Final Cancelled status and end
time are refetched, never invented. The backend remains authoritative if a worker
finishes after the row was loaded. canRetryRun stays false; there is no retry API.

Start Run reads only GET /api/v1/connectedaccounts/eligible?botId=...
The server checks ownership, bot assignment, activity/status, and cookie expiry.
An empty result disables Start Run; read failures expose an explicit retry.
Module configuration identifies the account options provider. Selection adapters
verify membership in the eligible response rather than fetching all accounts or
reproducing backend eligibility rules. ConnectedAccountDto uses expiredAt.

Module serializers receive parsed values and numeric bot context, then return
an opaque infoJson string passed unchanged. Omission explicitly means the module
has no metadata ("{}"). Concrete bot metadata schemas are not defined by this
contract, so production start forms remain deferred to the appropriate feature.
No guessed metadata or account-management behavior is introduced.

The dedicated Start run page preserves failed input, prevents duplicate submission,
and returns to run history after successful creation. Creation invalidates
history and eligibility. 429 and validation failures retain safe backend messages
with guidance. No cooldown countdown or structured field error is inferred.

Validate using type-check, lint, tests, and build. Tests exercise real services
with test-only HTTP adapters and page navigation in JSDOM. Full account/group
management, messaging, leads, and real-time integration remain outside this patch.
