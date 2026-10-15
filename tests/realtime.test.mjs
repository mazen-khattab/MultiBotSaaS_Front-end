import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { HttpClient, HttpResponse, HubConnectionState } from "@microsoft/signalr"
import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { createServer } from "vite"

const h = React.createElement
const user = { userId: "realtime-user", email: "user@example.test", name: "User", role: "User" }
const admin = { ...user, userId: "realtime-admin", role: "Admin" }
const session = { realm: "user", userId: user.userId, role: user.role }
const envelope = (data = user) => ({ isSuccess: true, message: "Success", errorType: 0, data })
const success = (config, data = user) => ({ config, data: envelope(data), status: 200, statusText: "OK", headers: {} })
const deferred = () => {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}
let dom, server, SignalRService, RealtimeProvider, RealtimeContext, AuthContext, AppProviders, useAuth
let api, originalAdapter, coordinator, SESSION_EXPIRED_MESSAGE
let refreshSession, useRealtime
let render, screen, cleanup, waitFor, act, latestAuth, latestRealtime
const globals = new Map()
const services = []

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173/login", pretendToBeVisual: true })
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, screen, cleanup, waitFor, act } = await import("@testing-library/react/pure.js"))
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  ;({ SignalRService } = await server.ssrLoadModule("/src/services/realtime/SignalRService.ts"))
  ;({ RealtimeProvider } = await server.ssrLoadModule("/src/context/realtime/RealtimeProvider.tsx"))
  ;({ RealtimeContext } = await server.ssrLoadModule("/src/context/realtime/RealtimeContext.tsx"))
  ;({ AuthContext } = await server.ssrLoadModule("/src/context/auth/AuthContext.tsx"))
  ;({ AppProviders } = await server.ssrLoadModule("/src/app/providers/AppProviders.tsx"))
  ;({ useAuth } = await server.ssrLoadModule("/src/context/auth/useAuth.ts"))
  ;({ useRealtime } = await server.ssrLoadModule("/src/context/realtime/useRealtime.ts"))
  ;({ api, refreshSession } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ refreshCoordinator: coordinator } = await server.ssrLoadModule("/src/core/api/refreshCoordinator.ts"))
  ;({ SESSION_EXPIRED_MESSAGE } = await server.ssrLoadModule("/src/core/api/apiError.ts"))
  originalAdapter = api.defaults.adapter
})
beforeEach(() => {
  coordinator.setSessionRealm("user")
  latestAuth = latestRealtime = undefined
  window.history.replaceState(null, "", "/login")
  api.defaults.adapter = async (config) => { throw new Error(`Unexpected auth request: ${config.url}`) }
})
afterEach(async () => {
  cleanup()
  await act(async () => { await Promise.resolve(); await Promise.all(services.splice(0).map((service) => service.stop())) })
  await coordinator.getPendingRefresh()?.catch(() => undefined)
})
after(async () => {
  api.defaults.adapter = originalAdapter
  await server?.close()
  dom?.window.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

/** Only the transport is replaced; the real service, auth and coordinator run. */
function harness({ send = async () => new HttpResponse(200), startGate, stopGate, ...options } = {}) {
  const connections = []
  const requests = []
  const inner = new class extends HttpClient {
    async send(request) { requests.push(request); return send(request) }
  }()
  const service = new SignalRService({ hubUrl: "https://api.test/hubs/notifications", apiBaseUrl: "https://api.test",
    httpClient: inner, createConnection: (url, config) => {
      const handlers = new Map()
      const connection = {
        state: HubConnectionState.Disconnected, starts: 0, stops: 0, url, config, handlers,
        async start() {
          this.starts++
          this.state = HubConnectionState.Connecting
          if (startGate) await startGate.promise
          const response = await config.httpClient.send({ method: "POST", url: `${url}/negotiate` })
          if (response.statusCode !== 200) { this.state = HubConnectionState.Disconnected; throw new Error("Negotiation failed") }
          this.state = HubConnectionState.Connected
        },
        async stop() {
          this.stops++
          this.state = HubConnectionState.Disconnecting
          if (stopGate) await stopGate.promise
          this.state = HubConnectionState.Disconnected
          this.close?.()
        },
        on(event, callback) { handlers.set(event, callback) },
        off(event, callback) { if (handlers.get(event) === callback) handlers.delete(event) },
        onclose(callback) { this.close = callback },
        onreconnecting(callback) { this.reconnecting = callback },
        onreconnected(callback) { this.reconnected = callback },
      }
      connections.push(connection)
      return connection
    }, ...options })
  services.push(service)
  return { service, connections, requests }
}

test("connection start/stop are idempotent and use only cookie-authenticated local subscriptions", async () => {
  const { service, connections, requests } = harness()
  const calls = []
  const remove = service.subscribe(session, "ScrapeCompleted", (...args) => calls.push(args))
  const first = service.start(session)
  assert.equal(service.start(session), first)
  await first
  await service.start({ ...session })
  const connection = connections[0]
  assert.equal(connection.starts, 1)
  assert.equal(connection.url, "https://api.test/hubs/notifications")
  assert.equal(connection.config.withCredentials, true)
  assert.equal("accessTokenFactory" in connection.config, false)
  assert.equal("headers" in connection.config, false)
  assert.deepEqual([...connection.handlers.keys()], ["ScrapeCompleted", "LeadStatusUpdated", "JobFailed"])
  connection.handlers.get("ScrapeCompleted")({ scrapeId: 42, leadsCount: 1 })
  remove(); remove()
  connection.handlers.get("ScrapeCompleted")({ scrapeId: 42, leadsCount: 1 })
  assert.equal(calls.length, 1)
  assert.throws(() => service.subscribe(session, "RunProgress", () => {}), /Unsupported/)
  for (const request of requests) assert.equal(request.withCredentials, true)
  await Promise.all([service.stop(), service.stop()])
  assert.equal(connection.stops, 1)
  assert.equal(connection.handlers.size, 0)
  assert.equal(service.getSnapshot().status, "Disconnected")
})

test("initial network failures expose retry without triggering authentication refresh", async () => {
  let failed = true
  const { service, connections } = harness({ send: async () => { if (failed) throw new Error("offline"); return new HttpResponse(200) } })
  await service.start(session)
  assert.equal(service.getSnapshot().status, "Disconnected")
  assert.match(service.getSnapshot().error, /Retry/)
  assert.equal(coordinator.getPendingRefresh(), null)
  assert.equal(coordinator.getExpiredError(), null)
  failed = false
  await service.start(session)
  assert.equal(connections.length, 1)
  assert.equal(service.getSnapshot().status, "Connected")
})

test("invalid hub configuration does not build or contact a connection", async () => {
  for (const hubUrl of ["", "https://other.test/hubs/notifications", "https://api.test/api/notifications", "https://api.test/hubs/notifications?access_token=bad"]) {
    const { service, connections, requests } = harness({ hubUrl })
    await service.start(session)
    assert.equal(service.getSnapshot().status, "Unavailable")
    assert.equal(connections.length, 0)
    assert.equal(requests.length, 0)
  }
})

test("hub and Axios 401s share the existing refresh coordinator and reissue with cookies", async () => {
  const gate = deferred()
  let rotations = 0, hubReads = 0
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("/refresh")) { rotations++; await gate.promise; return success(config) }
    if (!config._authRetry) throw new AxiosError("Unauthorized", "ERR_BAD_RESPONSE", config, undefined, { status: 401, data: "", headers: {}, config })
    return success(config)
  }
  const { service } = harness({ send: async () => new HttpResponse(++hubReads === 1 ? 401 : 200) })
  const starting = service.start(session)
  const http = api.get("/api/v1/test-auth-recovery")
  await waitFor(() => assert.equal(rotations, 1))
  gate.resolve()
  await Promise.all([starting, http])
  assert.equal(rotations, 1)
  assert.equal(hubReads, 2)
  assert.equal(service.getSnapshot().status, "Connected")
})

test("hub auth recovery uses the admin realm rather than the current pathname", async () => {
  coordinator.setSessionRealm("admin")
  let reads = 0
  const endpoints = []
  api.defaults.adapter = async (config) => { endpoints.push(config.url); return success(config, admin) }
  const { service } = harness({ send: async () => new HttpResponse(++reads === 1 ? 401 : 200) })
  await service.start({ realm: "admin", userId: admin.userId, role: admin.role })
  assert.deepEqual(endpoints, ["/api/v1/admin/auth/refresh"])
  assert.equal(service.getSnapshot().status, "Connected")
})

test("a delayed hub 401 reuses a completed cookie rotation without refreshing twice", async () => {
  const gate = deferred()
  let reads = 0, rotations = 0
  api.defaults.adapter = async (config) => { rotations++; return success(config) }
  const { service } = harness({ send: async () => { if (++reads === 1) { await gate.promise; return new HttpResponse(401) }; return new HttpResponse(200) } })
  const starting = service.start(session)
  await waitFor(() => assert.equal(reads, 1))
  await refreshSession("user")
  gate.resolve()
  await starting
  assert.equal(rotations, 1)
  assert.equal(reads, 2)
  assert.equal(service.getSnapshot().status, "Connected")
})

test("permission and server failures do not expire auth or rotate cookies", async () => {
  for (const status of [403, 500, 503]) {
    const { service, requests } = harness({ send: async () => new HttpResponse(status) })
    await service.start(session)
    assert.equal(service.getSnapshot().status, "Disconnected")
    assert.equal(requests.length, 1)
    assert.equal(coordinator.getExpiredError(), null)
  }
})

test("logout while initial start is pending cannot publish a late connection", async () => {
  const gate = deferred()
  const { service, connections } = harness({ startGate: gate })
  const starting = service.start(session)
  await waitFor(() => assert.equal(connections.length, 1))
  coordinator.notifyAuthExpired("Signed out")
  gate.resolve()
  await starting
  assert.equal(service.getSnapshot().status, "Disconnected")
  assert.equal(connections[0].state, "Disconnected")
})

test("session invalidation and repeated hub 401s stop without a refresh loop", async () => {
  for (const invalidated of [true, false]) {
    coordinator.setSessionRealm("user")
    let rotations = 0
    api.defaults.adapter = async (config) => { rotations++; return success(config) }
    const { service, connections, requests } = harness({ send: async () => new HttpResponse(401, "Unauthorized",
      invalidated ? JSON.stringify({ message: SESSION_EXPIRED_MESSAGE }) : "") })
    await service.start(session)
    await service.stop()
    assert.equal(rotations, invalidated ? 0 : 1)
    assert.equal(requests.length, invalidated ? 1 : 2)
    assert.ok(coordinator.getExpiredError())
    assert.equal(connections[0].state, "Disconnected")
    assert.equal(service.getSnapshot().status, "Disconnected")
  }
})

test("failed refresh and logout during a refresh prevent stale request replay", async () => {
  for (const logout of [false, true]) {
    coordinator.setSessionRealm("user")
    const gate = deferred()
    let rotations = 0
    api.defaults.adapter = async (config) => {
      rotations++; await gate.promise
      if (!logout) throw new AxiosError("Expired", "ERR_BAD_RESPONSE", config, undefined, { status: 401, data: "", headers: {}, config })
      return success(config)
    }
    const { service, requests } = harness({ send: async () => new HttpResponse(401) })
    const starting = service.start(session)
    await waitFor(() => assert.equal(rotations, 1))
    if (logout) coordinator.notifyAuthExpired("Signed out")
    gate.resolve()
    await starting
    assert.equal(requests.length, 1)
    assert.equal(service.getSnapshot().status, "Disconnected")
    assert.ok(coordinator.getExpiredError())
  }
})

test("principal changes serialize teardown and ignore old events and callbacks", async () => {
  const stopGate = deferred()
  const { service, connections } = harness({ stopGate })
  await service.start(session)
  const oldEvent = connections[0].handlers.get("JobFailed")
  const next = { ...session, userId: "second-user" }
  const received = []
  service.subscribe(next, "JobFailed", (...args) => received.push(args))
  const switching = service.start(next)
  await Promise.resolve()
  assert.equal(connections.length, 1)
  oldEvent({ jobId: 1, message: "old" })
  connections[0].reconnected()
  assert.notEqual(service.getSnapshot().status, "Connected")
  stopGate.resolve()
  await switching
  connections[1].handlers.get("JobFailed")({ jobId: 2, message: "new" })
  assert.equal(received.length, 1)
  assert.equal(received[0][0].jobId, 2)
})

function Probe() {
  latestAuth = useAuth()
  latestRealtime = useRealtime()
  return h("output", { "data-testid": "realtime" }, latestRealtime.status)
}
const authValue = (status = "authenticated", identity = user) => ({ status, user: status === "authenticated" ? identity : null,
  realm: status === "authenticated" ? "user" : null, loginUser: async () => user, loginAdmin: async () => admin,
  logout: async () => {}, refresh: async () => identity })

test("provider waits for authentication, survives StrictMode, retains same-principal connection, and cleans subscriptions", async () => {
  const { service, connections } = harness()
  let received = 0
  function Consumer() {
    const realtime = React.useContext(RealtimeContext)
    React.useEffect(() => realtime.subscribe("ScrapeCompleted", () => { received++ }), [realtime.subscribe])
    return h(Probe)
  }
  const tree = (auth, consumer = true) => h(React.StrictMode, null, h(AuthContext.Provider, { value: auth },
    h(RealtimeProvider, { service }, consumer ? h(Consumer) : h(Probe))))
  const view = render(tree(authValue("bootstrapping")))
  assert.equal(connections.length, 0)
  view.rerender(tree(authValue()))
  await screen.findByText("Connected")
  assert.equal(connections.length, 1)
  view.rerender(tree(authValue("authenticated", { ...user, name: "Renamed" })))
  await act(async () => { await Promise.resolve() })
  assert.equal(connections.length, 1)
  connections[0].handlers.get("ScrapeCompleted")({})
  assert.equal(received, 1)
  view.rerender(tree(authValue(), false))
  connections[0].handlers.get("ScrapeCompleted")({})
  assert.equal(received, 1)
  view.unmount()
  await act(async () => { await Promise.resolve() })
  assert.equal(connections[0].state, "Disconnected")
})

/** Drive the actual Microsoft builder/handshake/reconnect pipeline in memory.
 * Only its HttpClient is test-owned; no listener, URL, socket or RPC is faked in production.
 */
class InMemoryHubHttp extends HttpClient {
  negotiations = 0
  unauthorizedNegotiations = 0
  firstPoll = true
  pending = null
  requests = []
  async send(request) {
    this.requests.push(request)
    if (request.url.includes("/negotiate")) {
      if (this.unauthorizedNegotiations > 0) { this.unauthorizedNegotiations--; return new HttpResponse(401) }
      this.negotiations++
      this.firstPoll = true
      return new HttpResponse(200, "OK", JSON.stringify({ negotiateVersion: 1, connectionId: `test-${this.negotiations}`,
        connectionToken: `test-${this.negotiations}`, availableTransports: [{ transport: "LongPolling", transferFormats: ["Text"] }] }))
    }
    if (request.method === "GET") {
      if (this.firstPoll) { this.firstPoll = false; return new HttpResponse(200, "OK", "") }
      return new Promise((resolve) => {
        this.pending = (response) => { this.pending = null; resolve(response) }
        request.abortSignal.onabort = () => this.pending?.(new HttpResponse(204))
      })
    }
    if (request.method === "POST" && request.content.includes('"protocol"')) {
      this.pending?.(new HttpResponse(200, "OK", "{}\u001e"))
    }
    return new HttpResponse(200)
  }
  drop() { this.pending?.(new HttpResponse(204)) }
}

test("real SDK automatically reconnects and app auth refresh/logout retain cookie-only lifecycle", async () => {
  const http = new InMemoryHubHttp()
  const service = new SignalRService({ hubUrl: "https://api.test/hubs/notifications", apiBaseUrl: "https://api.test", httpClient: http })
  services.push(service)
  let rotations = 0
  const states = []
  service.observe(() => states.push(service.getSnapshot().status))
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("/refresh")) rotations++
    return success(config, config.url.endsWith("/logout") ? true : user)
  }
  render(h(React.StrictMode, null, h(AppProviders, { realtimeService: service }, h(Probe))))
  assert.equal(http.negotiations, 0)
  await act(async () => { await latestAuth.loginUser({ email: user.email, password: "test-only" }) })
  await waitFor(() => assert.equal(latestRealtime.status, "Connected"))
  assert.equal(http.negotiations, 1)
  await act(async () => { await latestAuth.refresh() })
  assert.equal(http.negotiations, 1)
  http.unauthorizedNegotiations = 1
  await act(async () => { http.drop() })
  await waitFor(() => assert.equal(http.negotiations, 2))
  await waitFor(() => assert.equal(latestRealtime.status, "Connected"))
  assert.ok(states.includes("Reconnecting"))
  assert.equal(rotations, 2)
  for (const request of http.requests) {
    assert.equal(request.withCredentials, true)
    assert.equal(Object.keys(request.headers ?? {}).some((name) => name.toLowerCase() === "authorization"), false)
    assert.equal(request.url.includes("access_token"), false)
  }
  await act(async () => { await latestAuth.logout() })
  await waitFor(() => assert.equal(latestRealtime.status, "Disconnected"))
  assert.equal(latestAuth.status, "anonymous")
  const count = http.negotiations
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)) })
  assert.equal(http.negotiations, count)
})
