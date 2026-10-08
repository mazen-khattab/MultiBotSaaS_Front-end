export interface BotRouteParams {
  botId: string
  tabSlug?: string
}

export type TopLevelRouteArea = "public" | "client" | "bot-workspace" | "admin"

export type RoutePath =
  | "/"
  | "/login"
  | "/admin/login"
  | "/dashboard"
  | "/dashboard/bots"
  | "/dashboard/settings"
  | "/admin"
  | "/admin/users"
  | "/admin/bots"
  | "/admin/subscriptions"
  | "/admin/transactions"
