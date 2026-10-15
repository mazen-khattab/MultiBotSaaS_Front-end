# Part 25 — Admin dashboard feature boundaries

Source: `Part_25.md` and `FRONTEND_BACKEND_CONTRACT_V2.md` §§12–14, 18.

## Implemented scope

- Admin routes now load pages from the users, bots, subscriptions, transactions,
  audit-logs and overview features. Existing route URLs, AdminLayout and
  Admin/SuperAdmin authentication/role guards are preserved. Audit logs adds the
  guarded `/admin/audit-logs` route and navigation item.
- Users, Bots and UserBot assignments each own validated DTOs, services and query
  hooks above the shared credentialed Axios/auth-refresh layer. Their paginated
  tables use server totals and only documented filters. Details are fetched afresh
  before editing or confirming lifecycle/removal actions.
- Users support creation, profile replacement and deactivate/reactivate. Passwords
  are request-only and absent from mutation variables, cached DTOs and error text.
  No hard-delete or administrative-account/role management is exposed.
- Bots support creation, metadata updates and activate/deactivate. New bots start
  inactive, accept dynamic module codes and retain zero price/cooldown. Editing
  omits immutable codes and lifecycle fields. Activation asks the administrator to
  confirm deployed frontend module support. No deletion or code migration exists.
- Subscriptions represent UserBot access. Assign sends only userId/botId; removal
  uses the assignment ID. Purchase fields are read-only legacy metadata, not
  payment controls. Removed relationships have no recoverable inactive history.
- Writes block duplicate submissions and automatic retries, then invalidate the
  related Admin reads on success or failure. Server acknowledgments determine
  success; no fake persistence or optimistic business state is introduced.
- Transactions, Admin audit logs, overview metrics and system configuration show
  explicit `Backend capability unavailable` states without speculative requests
  or DTOs. The overview links to available management features. User activity logs
  and User settings are never substituted for Admin APIs.

Each of the six feature READMEs documents its available operations and missing
capabilities. Commercial plans/billing remain unsupported. The centralized
capability matrix remains outside this Part.

## Definition of Done review

- [x] Admin route shells are organized by feature.
- [x] Auth and Users/Bots/UserBot boundaries reflect the available APIs and their
  exact supported operations. Backend active-admin/current-role authorization is
  authoritative; frontend guards do not replace it.
- [x] Missing APIs are documented in each feature README.

## Verification and remaining limitation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test tests/admin.test.mjs`: 15 passed. Real frontend services, hooks,
  forms, dialogs and tables run in JSDOM with test-only HTTP adapters.
- `node --test tests/admin.test.mjs tests/auth.test.mjs`: 47 passed, including
  the existing auth regression checks and the new audit-log route guard.
- `npm run build`: passed; Vite retains a nonfatal main-chunk size warning.
- `npm test`: 258 passed, 6 failed, 264 total. Five failures in
  `tests/leads.test.mjs` and one in `tests/workspace.test.mjs` expect the obsolete
  `/api/leads/...` URLs, while the committed Leads service uses `/api/v1/Leads/...`.
  All six were reproduced using an isolated archive of baseline commit `f6eb507`
  with the same test-name selection. Leads source and fixtures remain unchanged.
- `git diff --check`: passed.

The Part 25 implementation meets its three feature Definition of Done items;
repository-wide verification remains incomplete until those existing Leads test
fixtures are aligned. No live backend or real-browser session was exercised.
