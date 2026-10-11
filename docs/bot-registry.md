# Bot registry foundation (Part 10)

`src/registry/botModulesRegistry.ts` is the immutable source of frontend UI
composition, keyed by exact `UiModuleCode` strings. It contains no bot IDs,
subscriptions, API calls, or React state. It is deliberately empty: the backend
contract in `docs/FRONTEND_BACKEND_CONTRACT.md`, section 6.2, defines neither
exposed bot descriptors nor confirmed module code values. Module definitions
belong in `src/registry/definitions/` when later parts introduce them.

`BotModuleDefinition` describes optional display metadata, ordered sidebar tabs,
a component resolver, optional UI requirements, and named page configs. Each tab
has a slug, label, Lucide icon, lazy React component, and optional readonly config.
Pages receive a workspace `botId` and optional config; config values use `unknown`
until the consuming page narrows them. Sidebar array order determines tab order.
Permission and capability metadata does not establish subscription ownership or
grant authorization.

`resolveBotModule(uiModuleCode)` returns the registered `BotModuleDefinition`
directly or an `UnsupportedBotModuleError`. It returns the error rather than
throwing it. Callers can narrow the result with
`result instanceof UnsupportedBotModuleError` and inspect `kind`, `uiModuleCode`,
and `message`. The lookup is exact, considers only own registry entries, and does
not normalize codes, infer them from names/IDs, load pages, or fall back to another
module. The optional registry argument allows isolated tests without adding
production mock definitions.

Runtime bot API integration remains deferred until the contract exposes
subscribed bots, a bot descriptor by ID, and `UiModuleCode`. Workspace layout and
dynamic tab routing integration belong to Part 11. Existing routes remain the
handoff point for that work.

Validate with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
Registry tests exercise registered/unsupported lookups, exact key handling,
prototype collisions, lazy page preservation, and registry immutability with
test-only definitions.
