# Generic run creation

`GenericRunsPage` accepts a typed `RunsPageConfig` containing the existing table
config reference, dynamic form config, capabilities, and module-owned selection
and metadata adapters. A module's lazy page wrapper binds its concrete types and
registry config to this component. Shared routing and registry contracts stay
unchanged; no production module is registered without a confirmed UiModuleCode.

`startRun.resolveSelection` receives parsed form values and the numeric bot ID.
The feature owns account/group lookup, option queries, and readiness. It returns
the selected account ID, its verified status, and an optional target group ID.
The adapter accepts only `Active`; null status remains unverified. Both current
account DTOs omit `status`, so `isActive` cannot be substituted. Modules should
provide `startDisabledReason` while required data is unavailable. Server checks
remain authoritative when account state changes after selection.

`startRun.serializeInfoJson` owns the bot's metadata schema. Its string is passed
unchanged. Omission explicitly means the module sends no metadata (`"{}"`);
generic code never serializes the form wholesale or guesses a bot schema.

`RunsService.createRun` calls only `POST /api/v1/runs` through the shared cookie
client and checks the success envelope and integer run ID. The mutation does not
retry writes or insert run history into a cache. The modal retains values after
failure, prevents duplicate submissions and dismissal while pending, and closes
only after successful creation. The page displays only a creation acknowledgment.

429 messages retain the server's cooldown/concurrent-run explanation and ask the
user to wait. No countdown is inferred because Retry-After is unavailable. 422
and validation-path 400 failures preserve the server message and offer input and
account guidance; field errors are not invented. A 404 explains that bot access
or the selected account must be checked.

History, detail, cancel, and retry capabilities are explicitly false. The table
column contract is ready, but no table rows, history request, polling, or SignalR
history substitute is implemented. Enabling these capabilities requires a new
backend contract and implementation. Bot retrieval, confirmed UiModuleCodes,
bot metadata schemas, and account status exposure remain backend dependencies;
bot-specific account/group implementation belongs to subsequent work.

Verification: run `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`. The runs tests exercise the real service through a test-only
Axios adapter and the real page/modal with a QueryProvider in JSDOM.
