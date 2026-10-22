export const routePaths = {
  root: "/",
  login: "/login",
  adminLogin: "/admin/login",
  dashboard: "/dashboard",
  clientBots: "/dashboard/bots",
  clientSettings: "/dashboard/settings",
  botWorkspacePattern: "/dashboard/bots/:botId",
  botTabPattern: "/dashboard/bots/:botId/:tabSlug",
  botStartRunPattern: "/dashboard/bots/:botId/runs/start",
  botLeadDetailsPattern: "/dashboard/bots/:botId/leads/:leadId",
  admin: "/admin",
  adminUsers: "/admin/users",
  adminBots: "/admin/bots",
  adminSubscriptions: "/admin/subscriptions",
  adminTransactions: "/admin/transactions",
  adminAuditLogs: "/admin/audit-logs",
} as const

export const buildBotWorkspacePath = (botId: string) =>
  `/dashboard/bots/${encodeURIComponent(botId)}`

export const buildBotTabPath = (botId: string, tabSlug: string) =>
  `${buildBotWorkspacePath(botId)}/${encodeURIComponent(tabSlug)}`

export const buildBotStartRunPath = (botId: string) =>
  `${buildBotTabPath(botId, "runs")}/start`

export const buildBotLeadDetailsPath = (botId: string, leadId: number) =>
  `${buildBotTabPath(botId, "leads")}/${encodeURIComponent(String(leadId))}`
