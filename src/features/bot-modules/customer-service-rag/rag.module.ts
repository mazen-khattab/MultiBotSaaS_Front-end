import { BookOpen, MessageCircle, MessagesSquare, SlidersHorizontal } from "lucide-react"
import { lazy } from "react"

import type { BotModuleDefinition, BotTabDefinition } from "@/registry/botRegistry.types"

// These lazy shells allow workspace navigation to be reviewed in tests without
// loading feature pages or claiming that any RAG capability is implemented.
const tabs: readonly BotTabDefinition[] = Object.freeze([
  Object.freeze({ slug: "knowledge-base", label: "Knowledge Base", icon: BookOpen,
    component: lazy(() => import("./pages/KnowledgeBasePage")) }),
  Object.freeze({ slug: "conversations", label: "Conversations", icon: MessagesSquare,
    component: lazy(() => import("./pages/ConversationsPage")) }),
  Object.freeze({ slug: "prompt-settings", label: "Prompt Settings", icon: SlidersHorizontal,
    component: lazy(() => import("./pages/PromptSettingsPage")) }),
  Object.freeze({ slug: "playground", label: "Playground", icon: MessageCircle,
    component: lazy(() => import("./pages/ChatPlaygroundPage")) }),
])

/**
 * Unregistered composition only: V2 section 6.4 confirms neither a RAG runtime
 * code nor an API contract. Omitting uiModuleCode keeps this shell from being a
 * production registration. Tests supply their own code through the existing
 * registry injection boundary; routing and the production registry stay intact.
 */
export const ragModuleShell = Object.freeze({
  display: Object.freeze({ label: "Customer Service RAG" }),
  sidebarTabs: tabs,
  resolveComponent: (slug: string) => tabs.find((tab) => tab.slug === slug)?.component,
}) satisfies Omit<BotModuleDefinition, "uiModuleCode">
