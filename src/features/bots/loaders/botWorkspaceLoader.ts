import type { LoaderFunctionArgs } from "react-router-dom"

import { normalizeApiError } from "@/core/api/apiError"
import { BotsService } from "@/features/bots/services/BotsService"

import type {
  BotWorkspaceDescriptorLoader,
  BotWorkspaceLoaderData,
} from "@/features/bots/botWorkspace.types"

/** The backend establishes ownership; the adapter projects the existing context. */
const loadBotDescriptor: BotWorkspaceDescriptorLoader = async (botId, signal) => {
  if (!/^\d+$/.test(botId) || !Number.isInteger(Number(botId)) || Number(botId) <= 0 || Number(botId) > 2_147_483_647) return null
  try {
    const bot = await BotsService.getBot(Number(botId), true, signal)
    if (!bot.isSubscribed) return null
    return { botId: String(bot.id), name: bot.name, uiModuleCode: bot.uiModuleCode }
  } catch (error: unknown) {
    const normalized = normalizeApiError(error)
    if ("statusCode" in normalized && normalized.statusCode === 404) return null
    throw error
  }
}

/** Keep real retrieval separate from registry lookup and page rendering. */
export const createBotWorkspaceLoader = (loadDescriptor: BotWorkspaceDescriptorLoader = loadBotDescriptor) =>
  async ({ params, request }: LoaderFunctionArgs): Promise<BotWorkspaceLoaderData> => {
    const { botId } = params
    if (!botId) return { status: "not-found" }

    const descriptor = await loadDescriptor(botId, request.signal)
    // A descriptor for another bot must not populate the requested workspace.
    if (!descriptor || descriptor.botId !== botId) return { status: "not-found" }
    return { status: "ready", descriptor }
  }

export const botWorkspaceLoader = createBotWorkspaceLoader()
