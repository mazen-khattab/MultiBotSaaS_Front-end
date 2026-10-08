export const routePaths = {
  root: "/",
  login: "/login",
  adminLogin: "/admin/login",
  dashboard: "/dashboard",
  clientBots: "/dashboard/bots",
  clientSettings: "/dashboard/settings",
  botWorkspacePattern: "/dashboard/bots/:botId",
  botTabPattern: "/dashboard/bots/:botId/:tabSlug",
  admin: "/admin",
  adminUsers: "/admin/users",
  adminBots: "/admin/bots",
  adminSubscriptions: "/admin/subscriptions",
  adminTransactions: "/admin/transactions",
} as const

export const buildBotWorkspacePath = (botId: string) =>
  `/dashboard/bots/${encodeURIComponent(botId)}`

export const buildBotTabPath = (botId: string, tabSlug: string) =>
  `${buildBotWorkspacePath(botId)}/${encodeURIComponent(tabSlug)}`

