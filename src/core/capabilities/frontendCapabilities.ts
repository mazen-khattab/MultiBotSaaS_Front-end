import type { CapabilityStatus, FrontendCapability } from "./capability.types"

/** Audited frontend metadata, not a discovery API, permission system or rollout
 * flags. Read the documentation matrix before adding an integration. No routes,
 * credentials or executable actions live here; services still own HTTP requests.
 * An available entry does not override module config, ownership or server checks. */
export const frontendCapabilities = Object.freeze({
  userAuth: {
    status: "available", audience: "browser", contract: "§2.1.1–2.1.3",
    description: "User login, current identity and coordinated cookie refresh are integrated.",
  },
  adminAuth: {
    status: "available", audience: "browser", contract: "§2.1.5",
    description: "Admin login, current identity and coordinated admin cookie refresh are integrated.",
  },
  userLogout: {
    status: "available", audience: "browser", contract: "§2.1.4, §17.3",
    description: "User logout accepts the documented null acknowledgment and clears the frontend session through the existing auth lifecycle.",
  },
  adminLogout: {
    status: "available", audience: "browser", contract: "§2.1.5, §17.3",
    description: "Admin logout accepts the documented null acknowledgment and clears the frontend session through the existing auth lifecycle.",
  },
  registration: {
    status: "blocked-backend", audience: "browser", contract: "§2.1.6",
    description: "Public registration is unavailable. Administrators can create regular user accounts.",
  },
  passwordReset: {
    status: "blocked-backend", audience: "browser", contract: "§2.1.6",
    description: "Password reset and password change APIs are unavailable.",
  },
  botCatalog: {
    status: "available", audience: "browser", contract: "§6.1.1",
    description: "The active bot catalog includes the current user's subscription metadata.",
  },
  botSubscriptions: {
    status: "available", audience: "browser", contract: "§6.1.2",
    description: "Subscribed bots are read from the current user's UserBot assignments, including assigned inactive bots.",
  },
  botDetail: {
    status: "available", audience: "browser", contract: "§6.1.3–6.3",
    description: "Owned bot details resolve the exact registered UI module code; unknown codes retain the unsupported state.",
  },
  accounts: {
    status: "available", audience: "browser", contract: "§7.1.2–7.1.6",
    description: "Connected account CRUD uses bot-scoped reads and server-enforced user ownership.",
  },
  eligibleAccounts: {
    status: "available", audience: "browser", contract: "§7.1.1",
    description: "Eligible account reads use the backend's ownership, activation, status and cookie-expiry checks.",
  },
  groups: {
    status: "available", audience: "browser", contract: "§7.2",
    description: "Target group CRUD uses bot-scoped reads and server-enforced user ownership.",
  },
  runCreate: {
    status: "available", audience: "browser", contract: "§8.1.1",
    description: "Generic Scrape creation is integrated through the Runs service, hook and modal; production module configuration is a separate prerequisite.",
  },
  scraperRunConfiguration: {
    status: "available", audience: "browser", contract: "§3.4, §8.1.1",
    description: "All three registered scrapers have independent start-run forms. Eligible account selection is required; module-specific custom fields become infoJson.",
  },
  postScraperRunConfiguration: {
    status: "available", audience: "browser", contract: "§3.4, §8.1.1",
    description: "Post Scraper has an account picker, validated search term and result limit, and a module-owned infoJson serializer.",
  },
  runHistory: {
    status: "available", audience: "browser", contract: "§8.1.2",
    description: "Paginated Scrape history is integrated with bot, page and status filters.",
  },
  runDetail: {
    status: "available", audience: "browser", contract: "§8.1.3",
    description: "Scrape details are read on demand through the existing Runs feature.",
  },
  runCancel: {
    status: "available", audience: "browser", contract: "§8.1.4",
    description: "Cancellation uses the existing endpoint and server lifecycle checks.",
  },
  runRetry: {
    status: "blocked-backend", audience: "browser", contract: "§8.1.6",
    description: "Run retry is unsupported. Creating a new run is a separate operation.",
  },
  leadList: {
    status: "available", audience: "browser", contract: "§7.3.1",
    description: "Bot-scoped lead lists use the real paginated response and status filter.",
  },
  leadDetail: {
    status: "frontend-not-implemented", audience: "browser", contract: "§7.3.3, §16",
    description: "Lead details have a backend API; a frontend detail service, hook and view are not implemented.",
  },
  leadExport: {
    status: "blocked-backend", audience: "browser", contract: "§3.4, §16.3",
    description: "Lead export is unavailable because no export API or format contract exists.",
  },
  messagingPreview: {
    status: "available", audience: "browser", contract: "§7.3.2",
    description: "Messaging preview displays the server's dailyMessageLimit, messagesSent, allowedToProcessCount and leads.",
  },
  messagingDispatch: {
    status: "available", audience: "browser", contract: "§7.4.1",
    description: "Browser messaging dispatch uses session cookies and requires no worker API key.",
  },
  workerLeadStatus: {
    status: "worker-only", audience: "worker", contract: "§7.4.2",
    description: "Lead status callbacks require a worker API key and are not browser actions.",
  },
  workerJobStatus: {
    status: "worker-only", audience: "worker", contract: "§7.4.2",
    description: "Worker job status callbacks require a worker API key and are not browser actions.",
  },
  workerAccountStatus: {
    status: "worker-only", audience: "worker", contract: "§7.4.2",
    description: "Account status callbacks require a worker API key and are not browser actions.",
  },
  workerActivityLog: {
    status: "worker-only", audience: "worker", contract: "§7.4.2, §11.3",
    description: "Activity-log submission requires a worker API key and is not a browser action.",
  },
  scrapeCompletion: {
    status: "worker-only", audience: "webhook", contract: "§8.1.5",
    description: "Scrape completion is an external n8n webhook protected by its webhook secret, not browser cookies or a worker key.",
  },
  activityLogs: {
    status: "frontend-not-implemented", audience: "browser", contract: "§11",
    description: "User activity-log reads have a backend API, but no frontend service or page is implemented. They are not Admin audit logs.",
  },
  userSettings: {
    status: "available", audience: "browser", contract: "§10",
    description: "The regular user's settings GET/PUT integration preserves masked credentials and documented partial-field semantics.",
  },
  settingsCredentialRemoval: {
    status: "blocked-backend", audience: "browser", contract: "§10.5",
    description: "Credential removal is unavailable. Blank replacement fields preserve saved credentials.",
  },
  ragKnowledgeBase: {
    status: "blocked-backend", audience: "browser", contract: "§6.4",
    description: "Knowledge base storage, document uploads, and indexing are unavailable until backend support is added.",
  },
  ragConversations: {
    status: "blocked-backend", audience: "browser", contract: "§6.4",
    description: "Conversation history and messages are unavailable until backend support is added.",
  },
  ragPromptSettings: {
    status: "blocked-backend", audience: "browser", contract: "§6.4",
    description: "Prompt settings cannot be loaded or saved until backend support is added.",
  },
  ragPlayground: {
    status: "blocked-backend", audience: "browser", contract: "§6.4",
    description: "Playground chat is unavailable until backend support is added.",
  },
  adminUsers: {
    status: "available", audience: "browser", contract: "§12",
    description: "Regular-user list/detail/create/profile update and deactivate/reactivate are integrated; hard-delete and Admin account/role management are not exposed.",
  },
  adminBots: {
    status: "available", audience: "browser", contract: "§13",
    description: "Bot list/detail/create/metadata update and activate/deactivate are integrated; codes are immutable and there is no delete API.",
  },
  adminSubscriptions: {
    status: "available", audience: "browser", contract: "§14",
    description: "UserBot list/detail/assignment/removal are integrated; these relationships are access assignments, not commercial subscriptions.",
  },
  commercialPlans: {
    status: "blocked-backend", audience: "browser", contract: "§6.5, §18",
    description: "Commercial plans, recurring billing and payments are unavailable.",
  },
  clientPurchase: {
    status: "blocked-backend", audience: "browser", contract: "§6.5, §14",
    description: "Browse the catalog and open bots assigned to your account. Purchasing bots and changing subscriptions are unavailable here.",
  },
  adminTransactions: {
    status: "blocked-backend", audience: "browser", contract: "§18",
    description: "No Admin transaction API or response DTO exists. Commercial plans, billing and payment operations are unavailable.",
  },
  adminAuditLogs: {
    status: "blocked-backend", audience: "browser", contract: "§18",
    description: "No Admin audit-log read API exists. The regular-user activity-log endpoint cannot provide administrative audit logs.",
  },
  adminSystemConfiguration: {
    status: "blocked-backend", audience: "browser", contract: "§18",
    description: "No Admin system configuration API exists. Regular-user settings do not configure the platform.",
  },
  adminOverviewMetrics: {
    status: "blocked-backend", audience: "browser", contract: "§18",
    description: "No Admin overview or aggregate metrics API exists. Platform totals and KPIs are unavailable.",
  },
  clientOverviewMetrics: {
    status: "blocked-backend", audience: "browser", contract: "§6.5",
    description: "Active workflow and daily run totals are not available. Open a bot workspace to view its current run history.",
  },
  signalRScrapeCompleted: {
    status: "available", audience: "browser", contract: "§9.2–9.3",
    description: "ScrapeCompleted carries scrapeId and leadsCount. There is no RunCompleted alias or runId field.",
  },
  signalRLeadStatusUpdated: {
    status: "available", audience: "browser", contract: "§9.2–9.3",
    description: "LeadStatusUpdated carries leadId and Pending, Completed or Failed status, without bot scope or entity versions.",
  },
  signalRJobFailed: {
    status: "available", audience: "browser", contract: "§9.2–9.3",
    description: "JobFailed carries jobId and message. A worker job ID is not a Scrape ID, and the event does not cover every failure path.",
  },
  signalRProgress: {
    status: "blocked-backend", audience: "browser", contract: "§9.3",
    description: "Progress, start, log, counter, watchdog and account-status events are not emitted by the current backend.",
  },
  signalRReplay: {
    status: "blocked-backend", audience: "browser", contract: "§9.4",
    description: "Notification replay/resume is unavailable. Reconnect recovery refetches current data through existing read APIs.",
  },
  workerJobReads: {
    status: "blocked-backend", audience: "browser", contract: "§9.4",
    description: "No browser worker-job list/read API exists. Scrape history and messaging job acknowledgments do not establish one.",
  },
} as const satisfies Readonly<Record<string, FrontendCapability>>)

export type CapabilityId = keyof typeof frontendCapabilities

/** Reuse status wording in unavailable shells without adding authorization logic. */
export const capabilityStatusLabels: Readonly<Record<CapabilityStatus, string>> = Object.freeze({
  available: "Available",
  "blocked-backend": "Backend capability unavailable",
  "frontend-not-implemented": "Frontend integration pending",
  "worker-only": "External integration only",
})
