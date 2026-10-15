import {
  AbortError, DefaultHttpClient, HttpClient, HubConnectionBuilder, HubConnectionState, LogLevel,
  type HubConnection, type HttpRequest, type HttpResponse, type IHttpConnectionOptions,
} from "@microsoft/signalr"

import { refreshSession } from "@/core/api/api"
import { isSessionExpiredPayload } from "@/core/api/apiError"
import { refreshCoordinator } from "@/core/api/refreshCoordinator"
import { env } from "@/core/config/env"
import { readSignalREvent, signalREvents, type SignalREventName } from "@/services/realtime/signalr.events"
import type { RealtimeSession, RealtimeSnapshot, SignalREventHandler, SignalRWireHandler } from "@/services/realtime/signalr.types"

type Connection = Pick<HubConnection, "state" | "start" | "stop" | "on" | "off" | "onclose" | "onreconnecting" | "onreconnected">

interface SignalRServiceOptions {
  readonly hubUrl?: string
  readonly apiBaseUrl?: string
  readonly httpClient?: HttpClient
  readonly createConnection?: (url: string, options: IHttpConnectionOptions) => Connection
  readonly coordinator?: typeof refreshCoordinator
  readonly refresh?: (realm: RealtimeSession["realm"]) => Promise<unknown>
}

interface ConnectionSession {
  readonly key: string
  readonly principal: RealtimeSession
  connection?: Connection
  pending?: Promise<void>
  unsubscribeExpiry?: () => void
  needsRecovery: boolean
  recoveryVersion: number
  readonly handlers: Map<SignalREventName, SignalRWireHandler>
}

const sessionKey = (session: RealtimeSession) => JSON.stringify([session.realm, session.userId, session.role])

const silentLogger = { log: () => undefined }
const disconnectedSnapshot: RealtimeSnapshot = Object.freeze({ status: HubConnectionState.Disconnected, error: null, recoveryVersion: 0 })

/** Keep the configured hub on the API origin and the documented cookie-auth path. */
function hubAddress(hubUrl: string | undefined, apiBaseUrl: string | undefined): string {
  if (!hubUrl) throw new Error("Live updates are not configured.")
  const pageOrigin = typeof window === "undefined" ? undefined : window.location.origin
  const apiOrigin = new URL(apiBaseUrl ?? "/", pageOrigin).origin
  const hub = new URL(hubUrl, apiOrigin)
  if (!["http:", "https:"].includes(hub.protocol) || hub.origin !== apiOrigin ||
    hub.pathname !== "/hubs/notifications" || hub.search || hub.hash || hub.username || hub.password) {
    throw new Error("Live updates require the notifications hub on the configured API origin.")
  }
  return hub.href
}

/** Intercept actual HTTP 401s before SignalR wraps negotiation errors.
 * This preserves the default browser transports and never interprets a WebSocket
 * or CORS/network error as token expiry. Cookies remain owned by the browser.
 */
class SessionHttpClient extends HttpClient {
  constructor(private readonly inner: HttpClient, private readonly sendForSession: (request: HttpRequest, inner: HttpClient) => Promise<HttpResponse>) {
    super()
  }
  send(request: HttpRequest) { return this.sendForSession({ ...request, withCredentials: true }, this.inner) }
}

/** One reusable connection owner, with no routing or feature-cache dependencies. */
export class SignalRService {
  private readonly coordinator
  private readonly refresh
  private current: ConnectionSession | null = null
  private stopBarrier: Promise<void> = Promise.resolve()
  private snapshot: RealtimeSnapshot = disconnectedSnapshot
  private readonly observers = new Set<() => void>()
  private readonly subscriptions = new Map<symbol, { key: string; event: SignalREventName; handler: SignalRWireHandler }>()

  constructor(private readonly options: SignalRServiceOptions = {}) {
    this.coordinator = options.coordinator ?? refreshCoordinator
    this.refresh = options.refresh ?? refreshSession
  }

  // A new principal must never observe the previous session's recovery marker
  // while React is still running the provider's connection-switch effect.
  getSnapshot = (session?: RealtimeSession | null): RealtimeSnapshot =>
    session === undefined || (session && this.current?.key === sessionKey(session)) ? this.snapshot : disconnectedSnapshot
  
  observe = (callback: () => void) => {
    this.observers.add(callback)
    return () => { this.observers.delete(callback) }
  }

  private publish(status: RealtimeSnapshot["status"], error: string | null = null, recoveryVersion = this.snapshot.recoveryVersion) {
    if (this.snapshot.status === status && this.snapshot.error === error && this.snapshot.recoveryVersion === recoveryVersion) return
    this.snapshot = Object.freeze({ status, error, recoveryVersion })
    for (const callback of [...this.observers]) callback()
  }

  private connected(run: ConnectionSession) {
    if (this.current !== run) return
    // Consume each gap once, including manual retry after automatic reconnect
    // exhausts or initial start fails. Initial successful login needs no catch-up.
    if (run.needsRecovery) run.recoveryVersion++
    run.needsRecovery = false
    this.publish(HubConnectionState.Connected, null, run.recoveryVersion)
  }

  /** Subscribe locally, even before start; ownership prevents cross-session delivery. */
  subscribe<TEvent extends SignalREventName>(session: RealtimeSession, event: TEvent, handler: SignalREventHandler<TEvent>) {
    if (!signalREvents.includes(event)) throw new Error("Unsupported notification event.")
    const token = Symbol(event)
    const receive: SignalRWireHandler = (...args) => {
      const payload = readSignalREvent(event, args)
      if (payload === undefined) return
      // Async consumers must not create unhandled rejections or break other
      // subscribers. Query-backed features expose their own read errors.
      void Promise.resolve(handler(payload)).catch(() => undefined)
    }
    this.subscriptions.set(token, { key: sessionKey(session), event, handler: receive })
    return () => { this.subscriptions.delete(token) }
  }

  private requireActive(run: ConnectionSession) {
    if (this.current !== run || this.coordinator.getExpiredError()) throw new AbortError("The realtime session ended.")
  }

  private expire(run: ConnectionSession) {
    if (this.current === run) this.coordinator.notifyAuthExpired("Your session has ended. Sign in again.")
  }

  private async send(run: ConnectionSession, request: HttpRequest, inner: HttpClient): Promise<HttpResponse> {
    // DELETE closes a Long Polling transport. Allow that cleanup after logout,
    // but never refresh or replay a request once its session has ended.
    if (request.method === "DELETE") return inner.send(request)
    this.requireActive(run)
    const version = this.coordinator.getSessionVersion()
    const response = await inner.send(request)
    this.requireActive(run)
    if (response.statusCode !== 401) return response
    let body: unknown = response.content
    if (typeof body === "string") {
      try { body = JSON.parse(body) as unknown } catch { /* Bare 401s need no JSON body. */ }
    }
    if (isSessionExpiredPayload(body)) {
      this.expire(run)
      throw new AbortError("The realtime session ended.")
    }
    try {
      // Join the existing realm-aware rotation, including a concurrent Axios 401.
      // A delayed response from before a completed rotation reuses those cookies.
      if (version === this.coordinator.getSessionVersion() || this.coordinator.getPendingRefresh()) {
        await this.refresh(run.principal.realm)
      }
    } catch {
      this.expire(run)
      throw new AbortError("The realtime session ended.")
    }
    this.requireActive(run)
    const retried = await inner.send(request)
    this.requireActive(run)
    if (retried.statusCode === 401) {
      this.expire(run)
      throw new AbortError("The realtime session ended.")
    }
    return retried
  }

  private build(run: ConnectionSession): Connection {
    const url = hubAddress(this.options.hubUrl ?? env.signalRHubUrl, this.options.apiBaseUrl ?? env.apiBaseUrl)
    const inner = this.options.httpClient ?? new DefaultHttpClient(silentLogger)
    const options = { withCredentials: true, logMessageContent: false,
      httpClient: new SessionHttpClient(inner, (request, client) => this.send(run, request, client)) }
    const connection = this.options.createConnection
      ? this.options.createConnection(url, options)
      : new HubConnectionBuilder().withUrl(url, options).configureLogging(LogLevel.None).withAutomaticReconnect().build()

    for (const event of signalREvents) {
      const handler: SignalRWireHandler = (...args) => {
        if (this.current !== run || this.coordinator.getExpiredError()) return
        for (const subscription of [...this.subscriptions.values()]) {
          if (subscription.key === run.key && subscription.event === event) {
            try { subscription.handler(...args) } catch { /* Isolate consumer failures. */ }
          }
        }
      }
      run.handlers.set(event, handler)
      connection.on(event, handler)
    }
    connection.onreconnecting(() => {
      if (this.current !== run) return
      run.needsRecovery = true
      this.publish(HubConnectionState.Reconnecting)
    })
    connection.onreconnected(() => { this.connected(run) })
    connection.onclose(() => {
      if (this.current !== run) return
      run.needsRecovery = true
      this.publish(HubConnectionState.Disconnected, "Live updates disconnected. Retry to reconnect.")
    })
    return connection
  }

  /** Initial failures become explicit state; retry is manual, never an auth loop. */
  start(session: RealtimeSession): Promise<void> {
    const key = sessionKey(session)
    if (this.current?.key !== key) {
      void this.stop()
      const run: ConnectionSession = { key, principal: { ...session }, handlers: new Map(), needsRecovery: false, recoveryVersion: 0 }
      this.current = run
      run.unsubscribeExpiry = this.coordinator.onAuthExpired(() => { if (this.current === run) void this.stop() })
    }
    const run = this.current!
    if (run.pending) return run.pending
    if (run.connection?.state === HubConnectionState.Connected || run.connection?.state === HubConnectionState.Reconnecting) return Promise.resolve()
    const pending = (async () => {
      await this.stopBarrier
      if (this.current !== run || this.coordinator.getExpiredError()) return
      try {
        run.connection ??= this.build(run)
      } catch {
        this.publish("Unavailable", "Live updates require a configured notifications hub on the API origin.")
        return
      }
      this.publish(HubConnectionState.Connecting)
      try {
        await run.connection.start()
        if (this.current === run) this.connected(run)
        else if (run.connection.state !== HubConnectionState.Disconnected) await run.connection.stop()
      } catch {
        if (this.current === run) {
          run.needsRecovery = true
          this.publish(HubConnectionState.Disconnected, "Unable to connect to live updates. Retry to reconnect.")
        }
      }
    })().finally(() => { if (run.pending === pending) run.pending = undefined })
    run.pending = pending
    return pending
  }

  /** Mark obsolete work inactive immediately, then serialize transport teardown. */
  stop(): Promise<void> {
    const run = this.current
    if (!run) return this.stopBarrier
    this.current = null
    run.unsubscribeExpiry?.()
    for (const [token, subscription] of this.subscriptions) {
      if (subscription.key === run.key) this.subscriptions.delete(token)
    }
    if (run.connection) {
      for (const [event, handler] of run.handlers) run.connection.off(event, handler)
    }
    this.publish(HubConnectionState.Disconnected, null, 0)
    const stopped = run.connection?.stop().catch(() => undefined) ?? Promise.resolve()
    this.stopBarrier = Promise.all([this.stopBarrier, stopped]).then(() => undefined)
    return this.stopBarrier
  }
}

// Construction is inert. Only the authenticated provider may start this owner.
export const signalRService = new SignalRService()
