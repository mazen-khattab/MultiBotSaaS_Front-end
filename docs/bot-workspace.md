# Dynamic bot workspace (Part 11)

The workspace route has a `botWorkspaceLoader` boundary. Its production adapter
is deliberately absent: `docs/FRONTEND_BACKEND_CONTRACT.md`, section 6.2, exposes
neither bot retrieval nor subscription descriptors or confirmed `UiModuleCode`
values. Home and tab visits therefore display **Bot workspace data unavailable
until backend contract is exposed**, with the workspace shell, Home link, and
Back to bots link intact. No fake descriptor or guessed endpoint is used.

`BotWorkspaceDescriptor` is a frontend boundary with `botId`, `name`, and
`uiModuleCode`; it does not claim to describe an existing API response.
`BotWorkspaceDescriptorLoader` accepts a route ID and cancellation signal and
returns an authorized descriptor or null. `createBotWorkspaceLoader` adapts that
interface to the router and reports blocked, not-found, or ready data. It rejects
descriptors whose normalized ID differs from the route. Adapter errors propagate
to the existing route error boundary. Once an endpoint is documented, its adapter
must use the central API/session layer, forward cancellation, and establish bot
ownership before supplying data; React route guards alone do not authorize a
loader's request. No adapter is connected in this part.

`useBotModule` resolves a supplied descriptor through the Part 10 registry. It
returns ready module/tabs, unsupported-module error state, or unavailable state
without performing retrieval or maintaining API state. `BotWorkspaceLayout`
composes the sidebar and supplies ready descriptor/module data through Outlet
context. Unsupported workspaces retain their shell and display the module code.
The optional registry argument supports isolated tests without modifying the
application registry.

`BotWorkspaceSidebar` renders fixed Home navigation followed by the registry's
ordered tabs. Links use the existing encoded bot ID/tab slug path builders.
Permission/capability metadata is not used to invent entitlement rules.
`BotTabRoutePage` checks exact tab membership before calling the module's
component resolver, passes the workspace ID and tab config to its lazy component,
and uses a local Suspense loading state. Missing tabs or component resolutions
show workspace-level not found without redirecting. Unknown nested workspace
paths use the same fallback. Workspace Home consumes the same ready context.

Verification commands: `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`. `tests/workspace.test.mjs` uses test-only descriptors/adapters
and module definitions to exercise the real loader, hook, sidebar, layout,
and route components. The production registry remains immutable and empty.
