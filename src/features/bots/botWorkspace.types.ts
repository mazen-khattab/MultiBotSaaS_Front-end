import type { BotModuleDefinition } from "@/registry/botRegistry.types"

/** Frontend needs only these fields; this is not an invented backend DTO. */
export interface BotWorkspaceDescriptor {
  readonly botId: string
  readonly name: string
  readonly uiModuleCode: string
}

/**
 * A future adapter must retrieve an authorized descriptor through the documented
 * API, normalize its ID to a route string, and forward the cancellation signal.
 * Null means the requested workspace was not found or is not owned by the user.
 */
export type BotWorkspaceDescriptorLoader = (
  botId: string,
  signal: AbortSignal,
) => Promise<BotWorkspaceDescriptor | null>

export type BotWorkspaceLoaderData =
  | { readonly status: "blocked" }
  | { readonly status: "not-found" }
  | { readonly status: "ready"; readonly descriptor: BotWorkspaceDescriptor }

/** Only a ready workspace exposes a descriptor and module to its child routes. */
export interface BotWorkspaceContextValue {
  readonly descriptor: BotWorkspaceDescriptor
  readonly module: BotModuleDefinition
}
