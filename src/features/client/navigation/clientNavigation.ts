import { Bot, LayoutDashboard, Settings } from "lucide-react"

import { routePaths } from "@/app/router/routePaths"
import type { NavigationGroupDefinition } from "@/shared/types/navigation"

export const clientNavigation: readonly NavigationGroupDefinition[] = [
  {
    label: "Workspace",
    items: [
      { title: "Overview", href: routePaths.dashboard, icon: LayoutDashboard, end: true },
      { title: "My bots", href: routePaths.clientBots, icon: Bot, end: true },
      { title: "Settings", href: routePaths.clientSettings, icon: Settings },
    ],
  },
] as const

