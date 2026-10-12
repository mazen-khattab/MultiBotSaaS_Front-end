# Dynamic bot workspace (Part 11)

botWorkspaceLoader requests GET /api/v1/bots/{id}?requireOwnership=true through
the shared cookie client and forwards router cancellation. It projects BotDto
into the established botId/name/uiModuleCode descriptor, then useBotModule
resolves only the server's exact module code. Bot IDs never select modules.

The loader reports ready or not-found. Invalid route IDs, 404, unsubscribed data,
and mismatched descriptors remain not-found. Other retrieval errors propagate to
the existing route error boundary. React auth guards alone never authorize a
loader request; ownership is checked by the backend.

BotWorkspaceLayout composes the shell/sidebar and supplies ready context through
Outlet. Unsupported modules retain their shell and expose the actual module code.
BotWorkspaceSidebar preserves registry tab order and encoded links. BotTabRoutePage
checks membership before resolving a lazy component, supplies the bot ID/config,
and keeps local loading and missing-tab states inside the workspace shell.
The existing injectable descriptor loader and registry remain available for tests.

ClientBotsPage uses GET /api/v1/bots/subscribed for My bots and GET /api/v1/bots
for the available catalog. Only subscribed entries link to owned workspaces.
Both queries have independent loading/error/empty states. BotsService/useBots
also support bot details with requireOwnership=false or true, using distinct
cache keys. The registry exposes generic Runs pages for all three backend codes;
bot-specific forms and later-part features are not implemented here.

Validate with type-check, lint, tests, and production build. Tests cover API DTOs,
request parameters, ownership failures, unsupported codes, real workspace routes,
catalog/subscription lists, sidebar order, encoded navigation, and lazy loading.
