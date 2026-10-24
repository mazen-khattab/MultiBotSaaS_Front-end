import type { BotWorkspaceDescriptor } from "@/features/bots/botWorkspace.types";
import { UnsupportedBotModuleError } from "@/registry/botRegistry.errors";
import type {
  BotModuleDefinition,
  BotModulesRegistry,
  BotTabDefinition,
} from "@/registry/botRegistry.types";
import { resolveBotModule } from "@/registry/resolveBotModule";

type BotModuleState =
  | { status: "unavailable"; module: null; tabs: readonly []; error: null }
  | {
      status: "unsupported";
      module: null;
      tabs: readonly [];
      error: UnsupportedBotModuleError;
    }
  | {
      status: "ready";
      module: BotModuleDefinition;
      tabs: readonly BotTabDefinition[];
      error: null;
    };

/** Resolve supplied data only; this hook does not retrieve bots or own API state. */
export function useBotModule(descriptor: BotWorkspaceDescriptor | null, registry?: BotModulesRegistry): BotModuleState {
  if (!descriptor)
    return { status: "unavailable", module: null, tabs: [], error: null };

  const module = resolveBotModule(descriptor.uiModuleCode, registry);
  if (module instanceof UnsupportedBotModuleError) {
    return { status: "unsupported", module: null, tabs: [], error: module };
  }
  return { status: "ready", module, tabs: module.sidebarTabs, error: null };
}
