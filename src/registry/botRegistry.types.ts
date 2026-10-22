import type { LucideIcon } from "lucide-react"
import type { ComponentType, LazyExoticComponent } from "react"

/** Frontend page configuration; each page must narrow its own config values. */
export type BotPageConfig = Readonly<Record<string, unknown>>

/** Workspace context passed to a module page once routing is connected. */
export interface BotTabComponentProps {
  readonly botId: string
  readonly config?: BotPageConfig
  readonly view?: "start-run"
}

export type BotTabComponent = LazyExoticComponent<ComponentType<BotTabComponentProps>>

/** UI requirements are descriptive metadata, never proof of authorization. */
export interface BotUiRequirements {
  readonly permissions?: readonly string[]
  readonly capabilities?: readonly string[]
}

/** A tab declares its navigation entry, lazy page, and optional page config. */
export interface BotTabDefinition extends BotUiRequirements {
  readonly slug: string
  readonly label: string
  readonly icon: LucideIcon
  readonly component: BotTabComponent
  readonly config?: BotPageConfig
}

/** UI composition selected exclusively by a backend-supplied UiModuleCode. */
export interface BotModuleDefinition extends BotUiRequirements {
  readonly uiModuleCode: string
  readonly display?: {
    readonly label: string
    readonly description?: string
    readonly icon?: LucideIcon
  }
  // Array order is the sidebar tab order; there is no separate sort field.
  readonly sidebarTabs: readonly BotTabDefinition[]
  // Return the declared lazy component without loading it or making API calls.
  // An unknown tab stays unresolved rather than falling back to another page.
  readonly resolveComponent: (tabSlug: string) => BotTabComponent | undefined
  readonly pageConfigs?: Readonly<Record<string, BotPageConfig>>
}

/** Keys are exact UiModuleCode values, not bot IDs, names, or subscriptions. */
export type BotModulesRegistry = Readonly<Record<string, BotModuleDefinition>>
