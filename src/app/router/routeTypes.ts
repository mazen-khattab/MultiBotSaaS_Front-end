import type { ComponentType } from "react"

export interface LazyRouteModule {
  Component: ComponentType
}

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

