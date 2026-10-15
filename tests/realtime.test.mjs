import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { HttpClient, HttpResponse, HubConnectionState } from "@microsoft/signalr"
import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { createServer } from "vite"
import { QueryClient, QueryClientProvider, QueryObserver, useQueryClient } from "@tanstack/react-query"
import ts from "typescript"
import { fileURLToPath } from "node:url"

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
let readSignalREvent, RealtimeEventBridge, QueryProvider, queryKeys
let createRunRealtimeHandler, createLeadRealtimeHandlers, createJobRealtimeHandler
let createReconnectPolicy, RealtimeConnectionStatus
let useLeads, useMessagingPreview, useRuns, useEligibleAccounts
let render, screen, cleanup, waitFor, act, fireEvent, latestAuth, latestRealtime
const globals = new Map()
const services = []
const clients = []

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173/login", pretendToBeVisual: true })
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, screen, cleanup, waitFor, act, fireEvent } = await import("@testing-library/react/pure.js"))
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  ;({ SignalRService } = await server.ssrLoadModule("/src/services/realtime/SignalRService.ts"))
  ;({ RealtimeProvider } = await server.ssrLoadModule("/src/context/realtime/RealtimeProvider.tsx"))
  ;({ RealtimeContext } = await server.ssrLoadModule("/src/context/realtime/RealtimeContext.tsx"))
  ;({ AuthContext } = await server.ssrLoadModule("/src/context/auth/AuthContext.tsx"))
  ;({ AppProviders } = await server.ssrLoadModule("/src/app/providers/AppProviders.tsx"))
  ;({ useAuth } = await server.ssrLoadModule("/src/context/auth/useAuth.ts"))
  ;({ useRealtime } = await server.ssrLoadModule("/src/context/realtime/useRealtime.ts"))
  ;({ readSignalREvent } = await server.ssrLoadModule("/src/services/realtime/signalr.events.ts"))
  ;({ RealtimeEventBridge } = await server.ssrLoadModule("/src/features/realtime/RealtimeEventBridge.tsx"))
  ;({ QueryProvider } = await server.ssrLoadModule("/src/app/providers/QueryProvider.tsx"))
  ;({ queryKeys } = await server.ssrLoadModule("/src/core/query/queryKeys.ts"))
  ;({ createRunRealtimeHandler } = await server.ssrLoadModule("/src/features/runs/realtime/runRealtimeHandlers.ts"))
  ;({ createLeadRealtimeHandlers } = await server.ssrLoadModule("/src/features/leads/realtime/leadRealtimeHandlers.ts"))
  ;({ createJobRealtimeHandler } = await server.ssrLoadModule("/src/features/jobs/realtime/jobRealtimeHandlers.ts"))
  ;({ createReconnectPolicy } = await server.ssrLoadModule("/src/core/realtime/reconnectPolicy.ts"))
  ;({ RealtimeConnectionStatus } = await server.ssrLoadModule("/src/features/realtime/RealtimeConnectionStatus.tsx"))
  ;({ useLeads } = await server.ssrLoadModule("/src/features/leads/hooks/useLeads.ts"))
  ;({ useMessagingPreview } = await server.ssrLoadModule("/src/features/leads/hooks/useMessagingPreview.ts"))
  ;({ useRuns } = await server.ssrLoadModule("/src/features/runs/hooks/useRuns.ts"))
  ;({ useEligibleAccounts } = await server.ssrLoadModule("/src/features/runs/hooks/useEligibleAccounts.ts"))
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
  clients.splice(0).forEach((client) => client.clear())
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
  connections[0].handlers.get("ScrapeCompleted")({ scrapeId: 42, leadsCount: 0 })
  assert.equal(received, 1)
  view.rerender(tree(authValue(), false))
  connections[0].handlers.get("ScrapeCompleted")({ scrapeId: 42, leadsCount: 0 })
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
  assert.equal(service.getSnapshot().recoveryVersion, 1)
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

test("event schemas allowlist exact payloads, zero completion counts, and current lead statuses", () => {
  assert.deepEqual(readSignalREvent("ScrapeCompleted", [{ scrapeId: 42, leadsCount: 0, botId: 999 }]), { scrapeId: 42, leadsCount: 0 })
  for (const status of ["Pending", "Completed", "Failed"]) {
    assert.deepEqual(readSignalREvent("LeadStatusUpdated", [{ leadId: 2 ** 32, status }]), { leadId: 2 ** 32, status })
  }
  assert.deepEqual(readSignalREvent("JobFailed", [{ jobId: 85, message: "Timeout" }]), { jobId: 85, message: "Timeout" })
  for (const [event, args] of [
    ["RunCompleted", [{ scrapeId: 42, leadsCount: 1 }]], ["scrapecompleted", [{ scrapeId: 42, leadsCount: 1 }]],
    ["toString", [{}]], ["ScrapeCompleted", [{ runId: 42, leadsCount: 1 }]],
    ["ScrapeCompleted", [{ scrapeId: 42, leadsCount: -1 }]], ["ScrapeCompleted", [{ scrapeId: "42", leadsCount: 1 }]],
    ["ScrapeCompleted", [{ scrapeId: 42, leadsCount: 1 }, {}]], ["ScrapeCompleted", []],
    ["LeadStatusUpdated", [{ leadId: 101, status: "Contacted" }]], ["LeadStatusUpdated", [{ leadId: 101, status: "Messaged" }]],
    ["LeadStatusUpdated", [{ leadId: Number.MAX_SAFE_INTEGER + 1, status: "Completed" }]],
    ["JobFailed", [{ jobId: 0, message: "Timeout" }]], ["JobFailed", [{ jobId: 85 }]], ["JobFailed", [null]],
  ]) assert.equal(readSignalREvent(event, args), undefined)
})

test("invalid wire events never reach features, and throwing consumers do not interrupt valid consumers", async () => {
  const { service, connections } = harness()
  const received = []
  service.subscribe(session, "LeadStatusUpdated", (payload) => { received.push(payload) })
  service.subscribe(session, "JobFailed", () => { throw new Error("test consumer failed") })
  service.subscribe(session, "JobFailed", async () => { throw new Error("test async consumer failed") })
  service.subscribe(session, "JobFailed", (payload) => { received.push(payload) })
  await service.start(session)
  connections[0].handlers.get("LeadStatusUpdated")({ leadId: 101, status: "Contacted" })
  connections[0].handlers.get("LeadStatusUpdated")({ leadId: 101, status: "Completed", botId: 999 })
  connections[0].handlers.get("JobFailed")({ jobId: 85, message: "Timeout" })
  await Promise.resolve()
  assert.deepEqual(received, [{ leadId: 101, status: "Completed" }, { jobId: 85, message: "Timeout" }])
})

const clientForEvents = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  clients.push(client)
  return client
}
function seedEventReads(client) {
  const keys = {
    runs73: queryKeys.runs.list({ botId: 73, pageNumber: 2, statusFilter: "Running" }),
    runs74: queryKeys.runs.list({ botId: 74, pageNumber: 1, statusFilter: "Completed" }),
    run42: queryKeys.runs.detail(42), run43: queryKeys.runs.detail(43),
    leads73: queryKeys.leads.list({ botId: 73, pageNumber: 2, statusFilter: "Pending" }),
    leads74: queryKeys.leads.list({ botId: 74, pageNumber: 3, statusFilter: "Failed" }),
    preview73: queryKeys.leads.messagingPreview(73), preview74: queryKeys.leads.messagingPreview(74),
    accounts: queryKeys.accounts.list({ botId: 74 }), eligible: queryKeys.accounts.list({ purpose: "eligible", botId: 73 }),
    group: queryKeys.groups.detail(73, 5), bot: queryKeys.bots.detail(73), admin: queryKeys.admin.list(),
  }
  for (const key of Object.values(keys)) client.setQueryData(key, { items: [], totalItems: 4, status: "Running", collectedLeadsCount: 5 })
  return keys
}
const invalidated = (client, key) => client.getQueryState(key).isInvalidated

test("scrape completion refreshes relevant reads across bots without fabricating totals or final run fields", async () => {
  const client = clientForEvents()
  const keys = seedEventReads(client)
  const original = client.getQueryData(keys.run42)
  const onRun = createRunRealtimeHandler(client)
  const onLeads = createLeadRealtimeHandlers(client).ScrapeCompleted
  for (let duplicate = 0; duplicate < 2; duplicate++) {
    await Promise.all([onRun({ scrapeId: 42, leadsCount: 2 }), onLeads({ scrapeId: 42, leadsCount: 2 })])
  }
  for (const name of ["runs73", "runs74", "run42", "leads73", "leads74", "preview73", "preview74", "accounts", "eligible", "group"]) {
    assert.equal(invalidated(client, keys[name]), true, name)
  }
  for (const name of ["run43", "bot", "admin"]) assert.equal(invalidated(client, keys[name]), false, name)
  assert.equal(client.getQueryData(keys.run42), original)
  assert.equal(original.collectedLeadsCount, 5)
  assert.equal(original.status, "Running")
  assert.equal("endedAt" in original, false)
})

test("lead statuses invalidate paginated/filter/quota scopes instead of patching partial rows", async () => {
  const client = clientForEvents()
  const keys = seedEventReads(client)
  const original = client.getQueryData(keys.leads73)
  await createLeadRealtimeHandlers(client).LeadStatusUpdated({ leadId: 101, status: "Completed" })
  for (const name of ["leads73", "leads74", "preview73", "preview74"]) assert.equal(invalidated(client, keys[name]), true, name)
  for (const name of ["runs73", "run42", "accounts", "bot"]) assert.equal(invalidated(client, keys[name]), false, name)
  assert.equal(client.getQueryData(keys.leads73), original)
})

test("worker job failures never update a run with the same numeric ID or invent job cache records", async () => {
  const client = clientForEvents()
  const keys = seedEventReads(client)
  const count = client.getQueryCache().getAll().length
  const original = client.getQueryData(keys.run42)
  await createJobRealtimeHandler(client)({ jobId: 42, message: "Timeout" })
  for (const name of ["leads73", "preview74", "accounts", "eligible"]) assert.equal(invalidated(client, keys[name]), true, name)
  for (const name of ["run42", "runs73", "runs74", "group", "bot"]) assert.equal(invalidated(client, keys[name]), false, name)
  assert.equal(client.getQueryData(keys.run42), original)
  assert.equal(client.getQueryCache().getAll().length, count)
})

test("event bridge cleans all three subscriptions through StrictMode and principal changes", async () => {
  const { service, connections } = harness()
  let client, activeSubscriptions = 0
  const callbacks = []
  const subscribe = service.subscribe.bind(service)
  service.subscribe = (principal, event, callback) => {
    activeSubscriptions++
    callbacks.push({ event, callback })
    const remove = subscribe(principal, event, callback)
    let removed = false
    return () => { if (!removed) { removed = true; activeSubscriptions--; remove() } }
  }
  function CacheProbe() { client = useQueryClient(); return h(Probe) }
  const tree = (identity) => h(React.StrictMode, null, h(AuthContext.Provider, { value: authValue("authenticated", identity) },
    h(RealtimeProvider, { service }, h(QueryProvider, null, h(RealtimeEventBridge), h(CacheProbe)))))
  const view = render(tree(user))
  await screen.findByText("Connected")
  assert.equal(activeSubscriptions, 3)
  const oldClient = client
  const oldWireCallback = connections[0].handlers.get("LeadStatusUpdated")
  const oldFeatureCallback = callbacks.find((entry) => entry.event === "LeadStatusUpdated").callback
  view.rerender(tree({ ...user, userId: "next-principal" }))
  await waitFor(() => assert.equal(connections.length, 2))
  await screen.findByText("Connected")
  assert.notEqual(client, oldClient)
  assert.equal(activeSubscriptions, 3)
  const keys = seedEventReads(client)
  await act(async () => { oldWireCallback({ leadId: 101, status: "Failed" }); await oldFeatureCallback({ leadId: 101, status: "Failed" }) })
  assert.equal(invalidated(client, keys.leads73), false)
  await act(async () => { connections[1].handlers.get("LeadStatusUpdated")({ leadId: 101, status: "Completed" }) })
  assert.equal(invalidated(client, keys.leads73), true)
  const currentWireCallback = connections[1].handlers.get("LeadStatusUpdated")
  view.unmount()
  await act(async () => { await Promise.resolve() })
  assert.equal(activeSubscriptions, 0)
  currentWireCallback({ leadId: 101, status: "Failed" })
  assert.equal(client.getQueryCache().getAll().length, 0)
})

test("mounted app bridge refetches real feature services with their original bot, pagination, and filters", async () => {
  const { service, connections } = harness()
  let latestReads, collected = 5, completed = false
  const calls = []
  const lead = { leadId: 101, leadFormattedId: "LED-101", profileName: "Recipient", profileUrl: "https://example.test/profile",
    aiMessage: "Hello", fromGroup: "Source", status: "Pending", createdAt: "2026-10-15T12:00:00Z" }
  api.defaults.adapter = async (config) => {
    calls.push(config)
    if (config.url.endsWith("/login")) return success(config)
    if (config.url === "/api/v1/scrapes") return success(config, { items: [{ id: 42, botId: 73, groupId: 5, accountId: 12,
      collectedLeadsCount: collected, infoJson: "{}", startedAt: "2026-10-15T12:00:00Z", endedAt: null, status: "Running" }],
      totalItems: 40, totalPages: 4, currentPage: 2 })
    if (config.url === "/api/v1/Leads/leads/74") return success(config, { items: completed ? [] : [lead], totalItems: completed ? 0 : 21, totalPages: completed ? 0 : 3, currentPage: 3 })
    if (config.url === "/api/v1/Leads/bot/messaging-preview/74") return success(config, { dailyMessageLimit: 5, messagesSent: completed ? 5 : 0,
      allowedToProcessCount: completed ? 0 : 5, leads: [] })
    if (config.url === "/api/v1/connectedaccounts/eligible") return success(config, [])
    throw new Error(`Unexpected event-driven request: ${config.url}`)
  }
  function Reads() {
    const runs = useRuns({ botId: 73, pageNumber: 2, pageSize: 25, statusFilter: "Running" })
    const leads = useLeads({ botId: 74, pageNumber: 3, pageSize: 10, statusFilter: "Pending" })
    const preview = useMessagingPreview(74)
    useEligibleAccounts(73, true)
    latestReads = { runs, leads, preview }
    return h(Probe)
  }
  function AuthReads() { return useAuth().status === "authenticated" ? h(Reads) : h(Probe) }
  render(h(AppProviders, { realtimeService: service }, h(AuthReads)))
  await act(async () => { await latestAuth.loginUser({ email: user.email, password: "test-only" }) })
  await waitFor(() => assert.equal(latestReads.leads.data?.items.length, 1))
  await waitFor(() => assert.equal(latestReads.runs.data?.items[0].collectedLeadsCount, 5))
  completed = true
  await act(async () => { connections[0].handlers.get("LeadStatusUpdated")({ leadId: 101, status: "Completed" }) })
  await waitFor(() => assert.equal(latestReads.leads.data?.items.length, 0))
  await waitFor(() => assert.equal(latestReads.preview.data?.allowedToProcessCount, 0))
  const runReadCount = calls.filter((call) => call.url === "/api/v1/scrapes").length
  await act(async () => { connections[0].handlers.get("JobFailed")({ jobId: 42, message: "Timeout" }) })
  assert.equal(calls.filter((call) => call.url === "/api/v1/scrapes").length, runReadCount)
  collected = 7
  for (let duplicate = 0; duplicate < 2; duplicate++) {
    await act(async () => { connections[0].handlers.get("ScrapeCompleted")({ scrapeId: 42, leadsCount: 2 }) })
    await waitFor(() => assert.equal(latestReads.runs.data?.items[0].collectedLeadsCount, 7))
  }
  // A late status event cannot regress the server's filtered list or quota.
  await act(async () => { connections[0].handlers.get("LeadStatusUpdated")({ leadId: 101, status: "Pending" }) })
  await waitFor(() => assert.equal(latestReads.leads.data?.items.length, 0))
  assert.equal(latestReads.preview.data?.allowedToProcessCount, 0)

  // Miss all notifications during this gap. Batch both callbacks in one render:
  // recovery must still read the existing services, without replaying events.
  collected = 19
  completed = false
  await act(async () => { connections[0].reconnecting(); connections[0].reconnected() })
  await waitFor(() => assert.equal(latestReads.runs.data?.items[0].collectedLeadsCount, 19))
  await waitFor(() => assert.equal(latestReads.leads.data?.items.length, 1))
  await waitFor(() => assert.equal(latestReads.preview.data?.allowedToProcessCount, 5))
  for (const call of calls.filter((call) => call.url === "/api/v1/scrapes")) {
    assert.deepEqual(call.params, { botId: 73, pageNumber: 2, pageSize: 25, statusFilter: "Running" })
  }
  for (const call of calls.filter((call) => call.url === "/api/v1/Leads/leads/74")) {
    assert.deepEqual(call.params, { pageNumber: 3, pageSize: 10, statusFilter: "Pending" })
  }
})

test("recovery markers count successful gaps once and ignore obsolete session callbacks", async () => {
  let unavailable = true
  const { service, connections } = harness({ send: async () => {
    if (unavailable) throw new Error("offline")
    return new HttpResponse(200)
  } })
  await service.start(session)
  assert.equal(service.getSnapshot().recoveryVersion, 0)
  unavailable = false
  await service.start(session)
  assert.equal(service.getSnapshot().recoveryVersion, 1)
  connections[0].reconnecting()
  connections[0].reconnected()
  connections[0].reconnected()
  assert.equal(service.getSnapshot().recoveryVersion, 2)
  connections[0].state = HubConnectionState.Disconnected
  connections[0].close()
  assert.equal(service.getSnapshot().recoveryVersion, 2)
  await service.start(session)
  assert.equal(service.getSnapshot().recoveryVersion, 3)
  const next = { ...session, userId: "new-owner" }
  assert.equal(service.getSnapshot(next).recoveryVersion, 0)
  assert.equal(service.getSnapshot(next).status, "Disconnected")
  await service.start(next)
  connections[0].reconnecting()
  connections[0].reconnected()
  assert.equal(service.getSnapshot().recoveryVersion, 0)
  assert.equal(service.getSnapshot().status, "Connected")
  await service.stop()
  connections[1].reconnected()
  assert.equal(service.getSnapshot().status, "Disconnected")
})

test("reconnect policy refetches active scopes once, leaves inactive reads stale, and never enables disabled queries", async () => {
  const client = clientForEvents()
  const keys = seedEventReads(client)
  const count = client.getQueryCache().getAll().length
  const fetched = []
  const observers = []
  const observe = (name, key, enabled = true) => {
    const observer = new QueryObserver(client, { queryKey: key, enabled, staleTime: Infinity,
      queryFn: async () => { fetched.push(name); return { currentServerValue: name } } })
    observers.push(observer.subscribe(() => {}))
  }
  for (const name of ["runs73", "leads74", "preview73", "run42", "accounts", "eligible", "group", "bot", "admin"]) observe(name, keys[name])
  observe("disabled-run", queryKeys.runs.list({ botId: 0 }), false)
  const recover = createReconnectPolicy(client)
  try {
    await recover(0)
    assert.deepEqual(fetched, [])
    await Promise.all([recover(1), recover(1)])
    assert.deepEqual(fetched.sort(), ["runs73", "leads74", "preview73", "run42", "accounts", "eligible", "group"].sort())
    assert.equal(invalidated(client, keys.runs74), true)
    assert.equal(invalidated(client, keys.preview74), true)
    assert.equal(client.getQueryData(keys.preview73).currentServerValue, "preview73")
    await recover(1)
    assert.equal(fetched.length, 7)
    await recover(3)
    assert.equal(fetched.length, 14)
    assert.equal(client.getQueryCache().getAll().length, count + 1)
    assert.equal(client.getQueryCache().getAll().some((query) => query.queryKey[0] === "jobs"), false)
  } finally { observers.forEach((remove) => remove()) }
})

test("a failed recovery read retains server data and exposes a query error for normal retry", async () => {
  const client = clientForEvents()
  const key = queryKeys.leads.messagingPreview(73)
  const data = { allowedToProcessCount: 0, leads: [] }
  client.setQueryData(key, data)
  let failed = true
  const observer = new QueryObserver(client, { queryKey: key, staleTime: Infinity, retry: false,
    queryFn: async () => { if (failed) throw new Error("read unavailable"); return { ...data, allowedToProcessCount: 4 } } })
  const remove = observer.subscribe(() => {})
  try {
    await createReconnectPolicy(client)(1)
    assert.equal(client.getQueryData(key), data)
    assert.equal(client.getQueryState(key).status, "error")
    assert.equal(invalidated(client, key), true)
    failed = false
    await observer.refetch()
    assert.equal(client.getQueryData(key).allowedToProcessCount, 4)
  } finally { remove() }
})

test("StrictMode recovery is consumed once and cannot carry across principal changes or unmount", async () => {
  const { service, connections } = harness()
  let client
  function CacheProbe() { client = useQueryClient(); return h(Probe) }
  const tree = (identity) => h(React.StrictMode, null, h(AuthContext.Provider, { value: authValue("authenticated", identity) },
    h(RealtimeProvider, { service }, h(QueryProvider, null, h(RealtimeEventBridge), h(CacheProbe)))))
  const view = render(tree(user))
  await screen.findByText("Connected")
  let calls = 0
  const invalidate = client.invalidateQueries.bind(client)
  client.invalidateQueries = (...args) => { calls++; return invalidate(...args) }
  await act(async () => { connections[0].reconnecting(); connections[0].reconnected() })
  assert.equal(calls, 4)
  view.rerender(tree({ ...user, name: "Same principal" }))
  await act(async () => { await Promise.resolve() })
  assert.equal(calls, 4)
  view.rerender(tree({ ...user, userId: "next-principal" }))
  await waitFor(() => assert.equal(connections.length, 2))
  await screen.findByText("Connected")
  const keys = seedEventReads(client)
  await act(async () => { connections[0].reconnecting(); connections[0].reconnected() })
  assert.equal(invalidated(client, keys.leads73), false)
  assert.equal(service.getSnapshot().recoveryVersion, 0)
  view.unmount()
  await act(async () => { await Promise.resolve(); connections[1].reconnecting(); connections[1].reconnected() })
  assert.equal(client.getQueryCache().getAll().length, 0)
  assert.equal(service.getSnapshot().status, "Disconnected")
})

test("connection notice distinguishes browser disconnection from backend work and offers manual retry", async () => {
  let failed = true
  const { service, connections } = harness({ send: async () => {
    if (failed) throw new Error("offline")
    return new HttpResponse(200)
  } })
  render(h(AuthContext.Provider, { value: authValue() }, h(RealtimeProvider, { service }, h(RealtimeConnectionStatus))))
  await screen.findByText("Live updates disconnected.")
  assert.match(screen.getByRole("status").textContent, /Backend jobs run independently of this browser connection/)
  assert.equal(coordinator.getExpiredError(), null)
  failed = false
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry live updates" })) })
  await waitFor(() => assert.equal(screen.queryByRole("status"), null))
  assert.equal(service.getSnapshot().recoveryVersion, 1)
  await act(async () => { connections[0].reconnecting() })
  assert.match(screen.getByRole("status").textContent, /Live updates reconnecting/)
  assert.equal(screen.queryByRole("button"), null)
  await act(async () => { connections[0].reconnected() })
  assert.equal(screen.queryByRole("status"), null)
  await act(async () => { connections[0].handlers.get("JobFailed")({ jobId: 42, message: "Timeout" }) })
  assert.equal(screen.queryByRole("status"), null)
  assert.equal(service.getSnapshot().status, "Connected")
})

test("typed realtime subscriptions reject aliases, mismatched payloads, and undocumented fields", () => {
  const project = fileURLToPath(new URL("../tsconfig.app.json", import.meta.url))
  const loaded = ts.readConfigFile(project, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, fileURLToPath(new URL("../", import.meta.url)))
  const program = ts.createProgram([
    fileURLToPath(new URL("./realtime.types.fixture.ts", import.meta.url)),
    fileURLToPath(new URL("../src/vite-env.d.ts", import.meta.url)),
  ], { ...parsed.options, tsBuildInfoFile: undefined })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => "\n",
  }))
})
