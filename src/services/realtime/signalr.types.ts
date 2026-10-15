import type { HubConnectionState } from "@microsoft/signalr"

import type { AuthRealm } from "@/services/auth/auth.types"
import type { SignalREventName } from "@/services/realtime/signalr.events"

/** A principal owns a connection; rotating its cookies does not change ownership. */
export interface RealtimeSession {
  readonly realm: AuthRealm
  readonly userId: string
  readonly role: string
}

export interface RealtimeSnapshot {
  readonly status: HubConnectionState | "Unavailable"
  readonly error: string | null
}

/** Exact camelCase server payloads; neither entity ID implies the current bot. */
export interface ScrapeCompletedPayload {
  readonly scrapeId: number
  readonly leadsCount: number
}

export interface LeadStatusUpdatedPayload {
  readonly leadId: number
  readonly status: "Pending" | "Completed" | "Failed"
}

export interface JobFailedPayload {
  readonly jobId: number
  readonly message: string
}

export interface SignalREventPayloadMap {
  readonly ScrapeCompleted: ScrapeCompletedPayload
  readonly LeadStatusUpdated: LeadStatusUpdatedPayload
  readonly JobFailed: JobFailedPayload
}

/** Only wire callbacks see untrusted arguments; subscribers receive validated data. */
export type SignalRWireHandler = (...args: unknown[]) => void
export type SignalREventHandler<TEvent extends SignalREventName> =
  (payload: SignalREventPayloadMap[TEvent]) => void | Promise<void>
export type SignalREventHandlers = { readonly [TEvent in SignalREventName]: SignalREventHandler<TEvent> }
export type RealtimeSubscribe = <TEvent extends SignalREventName>(event: TEvent, handler: SignalREventHandler<TEvent>) => () => void

export interface RealtimeContextValue extends RealtimeSnapshot {
  readonly subscribe: RealtimeSubscribe
  readonly retry: () => Promise<void>
}
