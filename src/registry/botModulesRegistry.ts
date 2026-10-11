import type { BotModulesRegistry } from "@/registry/botRegistry.types"

// Part 10 introduces the composition boundary only. The backend contract has
// neither a bot descriptor endpoint nor confirmed UiModuleCode values, so no
// guessed module definitions or subscription data belong in this registry.
// Future definitions must use readonly metadata and tab/config collections.
export const botModulesRegistry: BotModulesRegistry = Object.freeze({})
