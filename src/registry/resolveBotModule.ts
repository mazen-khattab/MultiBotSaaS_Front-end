import { botModulesRegistry } from "@/registry/botModulesRegistry"
import { UnsupportedBotModuleError } from "@/registry/botRegistry.errors"
import type { BotModuleDefinition, BotModulesRegistry } from "@/registry/botRegistry.types"

/**
 * Return the exact registered definition or a typed error; never throw or infer
 * a module from a bot name/ID. The optional registry supports isolated tests
 * without mutating the immutable application registry.
 */
export const resolveBotModule = (
  uiModuleCode: string,
  registry: BotModulesRegistry = botModulesRegistry,
): BotModuleDefinition | UnsupportedBotModuleError => {
  // Object prototype members (for example, "toString") are not registrations.
  // Preserve case and whitespace so an unknown backend code fails explicitly.
  console.log(registry)
  const definition = Object.hasOwn(registry, uiModuleCode) ? registry[uiModuleCode] : undefined
  return definition ?? new UnsupportedBotModuleError(uiModuleCode)
}
