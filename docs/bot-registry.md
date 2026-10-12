# Bot registry foundation (Part 10)

The immutable botModulesRegistry composes UI by exact backend uiModuleCode values:
FB-MEMBERS-SCRAPER, FB-POSTS-SCRAPER, and FB-MEMBERS-MESSAGES-SCRAPER.
It contains no bot IDs, subscriptions, API calls, or React state. Each definition
registers the existing generic Runs tab and its readonly config. Bot-specific
forms, connected account management, groups, leads, and messaging remain deferred.

BotModuleDefinition retains display metadata, ordered sidebar tabs, a lazy
component resolver, optional UI requirements, and named page configs. Permission
and capability metadata never proves ownership or grants authorization.

resolveBotModule returns the matching definition or UnsupportedBotModuleError.
Lookup is exact, own-key-only, and never normalizes codes or infers a module from
IDs/names. It does not load pages or fall back to another module. Test-only
registries can still be injected without modifying production definitions.

Runtime retrieval now uses real Bot APIs from FRONTEND_BACKEND_CONTRACT_V2.md.
The workspace loader requests owned BotDto data and forwards its module code to
the registry. See bot-workspace.md. Unknown future codes retain the unsupported
module state, even when the user owns their bot.

Validate with type-check, lint, tests, and production build. Registry tests cover
exact codes, unknown codes, prototype collisions, lazy references, and immutability.
