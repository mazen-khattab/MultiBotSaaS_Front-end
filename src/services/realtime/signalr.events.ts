/** Local subscriptions accept only the backend's exact event names.
 * Payload typing and feature consumption belong to Part 22.
 */
export const signalREvents = ["ScrapeCompleted", "LeadStatusUpdated", "JobFailed"] as const
export type SignalREventName = typeof signalREvents[number]
