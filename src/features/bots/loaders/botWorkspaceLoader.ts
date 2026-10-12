import type { LoaderFunctionArgs } from "react-router-dom"

import type {
  BotWorkspaceDescriptorLoader,
  BotWorkspaceLoaderData,
} from "@/features/bots/botWorkspace.types"

/** Keep descriptor retrieval separate from registry lookup and page rendering. */
export const createBotWorkspaceLoader = (loadDescriptor?: BotWorkspaceDescriptorLoader) =>
  async ({ params, request }: LoaderFunctionArgs): Promise<BotWorkspaceLoaderData> => {
    const { botId } = params
    if (!botId) return { status: "not-found" }

    // No adapter is installed until the backend contract exposes bot retrieval.
    // In particular, never manufacture a descriptor from the route or bot name.
    if (!loadDescriptor) return { status: "blocked" }

    const descriptor = await loadDescriptor(botId, request.signal)
    // A descriptor for another bot must not populate the requested workspace.
    if (!descriptor || descriptor.botId !== botId) return { status: "not-found" }
    return { status: "ready", descriptor }
  }

export const botWorkspaceLoader = createBotWorkspaceLoader()
