import { Bot, LayoutDashboard, Settings } from "lucide-react"

import { routePaths } from "@/app/router/routePaths"
import type { NavigationGroupDefinition } from "@/shared/types/navigation"

export const clientNavigation: readonly NavigationGroupDefinition[] = [
  {
    label: "Workspace",
    items: [
      {
        key: "client-overview",
        title: "Overview",
        href: routePaths.dashboard,
        icon: LayoutDashboard,
        end: true,
      },
      { key: "client-bots", title: "My bots", href: routePaths.clientBots, icon: Bot, end: true },
      { key: "client-settings", title: "Settings", href: routePaths.clientSettings, icon: Settings },
    ],
  },
] as const
