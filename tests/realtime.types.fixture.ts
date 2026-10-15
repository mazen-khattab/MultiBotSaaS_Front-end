import type {
  JobFailedPayload, LeadStatusUpdatedPayload, RealtimeSubscribe, ScrapeCompletedPayload,
} from "@/services/realtime/signalr.types"

declare const subscribe: RealtimeSubscribe

subscribe("ScrapeCompleted", (payload) => {
  const scrapeId: number = payload.scrapeId
  const leadsCount: number = payload.leadsCount
  void [scrapeId, leadsCount]
  // @ts-expect-error The backend sends scrapeId, not runId.
  void payload.runId
  // @ts-expect-error Events do not identify the currently open bot.
  void payload.botId
})
subscribe("LeadStatusUpdated", (payload) => {
  const status: "Pending" | "Completed" | "Failed" = payload.status
  void status
  // @ts-expect-error A lead-status event is not a scrape-completion event.
  void payload.scrapeId
})
subscribe("JobFailed", (payload) => {
  const failure: JobFailedPayload = payload
  void failure
  // @ts-expect-error A worker job is not a run.
  void payload.runId
})
// @ts-expect-error No RunCompleted alias exists.
subscribe("RunCompleted", () => {})
// @ts-expect-error Event names preserve exact case.
subscribe("scrapecompleted", () => {})
// @ts-expect-error A callback must accept its selected event's payload.
subscribe("JobFailed", (payload: ScrapeCompletedPayload) => { void payload })
// @ts-expect-error Contacted is not a current serialized LeadStatus value.
export const invalidLeadStatus: LeadStatusUpdatedPayload = { leadId: 101, status: "Contacted" }
