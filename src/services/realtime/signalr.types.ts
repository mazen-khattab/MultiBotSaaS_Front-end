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

// Raw arguments stay unknown until the next part validates the event payloads.
export type SignalREventHandler = (...args: unknown[]) => void
export type RealtimeSubscribe = (event: SignalREventName, handler: SignalREventHandler) => () => void

export interface RealtimeContextValue extends RealtimeSnapshot {
  readonly subscribe: RealtimeSubscribe
  readonly retry: () => Promise<void>
}
