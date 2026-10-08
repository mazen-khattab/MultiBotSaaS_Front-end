import { Bot, CreditCard, LayoutDashboard, ReceiptText, Users } from "lucide-react"

import { routePaths } from "@/app/router/routePaths"
import type { NavigationGroupDefinition } from "@/shared/types/navigation"

export const adminNavigation: readonly NavigationGroupDefinition[] = [
  {
    label: "Management",
    items: [
      {
        key: "admin-overview",
        title: "Overview",
        href: routePaths.admin,
        icon: LayoutDashboard,
        end: true,
      },
      { key: "admin-users", title: "Users", href: routePaths.adminUsers, icon: Users },
      { key: "admin-bots", title: "Bots", href: routePaths.adminBots, icon: Bot },
      {
        key: "admin-subscriptions",
        title: "Subscriptions",
        href: routePaths.adminSubscriptions,
        icon: CreditCard,
      },
      {
        key: "admin-transactions",
        title: "Transactions",
        href: routePaths.adminTransactions,
        icon: ReceiptText,
      },
    ],
  },
] as const
