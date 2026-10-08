import { Bot, CreditCard, LayoutDashboard, ReceiptText, Users } from "lucide-react"

import { routePaths } from "@/app/router/routePaths"
import type { NavigationGroupDefinition } from "@/shared/types/navigation"

export const adminNavigation: readonly NavigationGroupDefinition[] = [
  {
    label: "Management",
    items: [
      { title: "Overview", href: routePaths.admin, icon: LayoutDashboard, end: true },
      { title: "Users", href: routePaths.adminUsers, icon: Users },
      { title: "Bots", href: routePaths.adminBots, icon: Bot },
      { title: "Subscriptions", href: routePaths.adminSubscriptions, icon: CreditCard },
      { title: "Transactions", href: routePaths.adminTransactions, icon: ReceiptText },
    ],
  },
] as const

