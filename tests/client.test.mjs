import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { MemoryRouter } from "react-router-dom"
import { createServer } from "vite"

const h = React.createElement
const user = { userId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", email: "user@example.test", name: "User", role: "User" }
const auth = { status: "authenticated", realm: "user", user }
const savedSettings = { hasAIApiKey: true, maskedAIApiKey: "********1234", hasScraperToken: false, maskedScraperToken: "",
  dailyLeadLimit: 0, companyName: null, companyPitch: "Our pitch" }
const bot = { id: 73, name: "Server bot", description: null, currentPrice: 39, uiModuleCode: "FUTURE-CRM-2027",
  cooldownMinutes: 180, isActive: true, status: "Active", isSubscribed: false, subscribedAt: null }
const secret = "replacement-test-secret"
const success = (config, data) => ({ config, status: 200, statusText: "OK", headers: {},
  data: { isSuccess: true, message: "Success", errorType: 0, data } })
const failure = (config, status = 400, message = "Invalid input") => new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, {
  config, status, statusText: "Error", headers: {}, data: { isSuccess: false, statusCode: status, message, path: config.url, method: config.method, traceId: "test" },
})
const deferred = () => { let resolve; const promise = new Promise((res) => { resolve = res }); return { promise, resolve } }
let dom, server, api, service, SettingsPage, OverviewPage, BotsPage, AuthContext, QueryProvider, queryKeys
let render, screen, fireEvent, cleanup, waitFor, act, within
let originalAdapter, originalBaseUrl, coordinator
const globals = new Map(), clients = []

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173/dashboard/settings" })
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, screen, fireEvent, cleanup, waitFor, act, within } = await import("@testing-library/react/pure.js"))
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  ;({ api } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ UserSettingsService: service } = await server.ssrLoadModule("/src/features/client/services/UserSettingsService.ts"))
  ;({ default: SettingsPage } = await server.ssrLoadModule("/src/features/client/pages/ClientSettingsPage.tsx"))
  ;({ default: OverviewPage } = await server.ssrLoadModule("/src/features/client/pages/ClientOverviewPage.tsx"))
  ;({ default: BotsPage } = await server.ssrLoadModule("/src/features/client/pages/ClientBotsPage.tsx"))
  ;({ AuthContext } = await server.ssrLoadModule("/src/context/auth/AuthContext.tsx"))
  ;({ QueryProvider } = await server.ssrLoadModule("/src/app/providers/QueryProvider.tsx"))
  ;({ queryKeys } = await server.ssrLoadModule("/src/core/query/queryKeys.ts"))
  ;({ refreshCoordinator: coordinator } = await server.ssrLoadModule("/src/core/api/refreshCoordinator.ts"))
  originalAdapter = api.defaults.adapter
  originalBaseUrl = api.defaults.baseURL
})
beforeEach(() => {
  api.defaults.baseURL = "https://api.test"
  coordinator.setSessionRealm("user")
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/settings") return success(config, config.method === "get" ? savedSettings : user.userId)
    throw new Error(`Unexpected client request: ${config.url}`)
  }
})
afterEach(async () => {
  cleanup()
  await act(async () => { await Promise.resolve() })
  clients.splice(0).forEach((client) => client.clear())
  await coordinator.getPendingRefresh()?.catch(() => undefined)
})
after(async () => {
  api.defaults.adapter = originalAdapter
  api.defaults.baseURL = originalBaseUrl
  await server?.close()
  dom?.window.close()
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  clients.push(client)
  const Wrapper = ({ children }) => h(AuthContext.Provider, { value: auth }, h(QueryClientProvider, { client }, h(MemoryRouter, null, children)))
  return { client, Wrapper }
}
function mount(Page = SettingsPage) {
  const { client, Wrapper } = wrapper()
  return { ...render(h(Page), { wrapper: Wrapper }), client }
}
const submit = () => fireEvent.submit(screen.getByRole("form", { name: "User settings" }))

test("Settings GET strips unknown fields and PUT sends exact semantics with cookies and a GUID acknowledgment", async () => {
  const calls = []
  const signal = new AbortController().signal
  api.defaults.adapter = async (config) => {
    assert.equal(config.withCredentials, true)
    assert.equal(config.headers.has("Authorization"), false)
    assert.equal(config.headers.has("x-worker-api-key"), false)
    calls.push({ method: config.method, url: config.url, params: config.params, body: config.data ? JSON.parse(config.data) : undefined })
    if (config.method === "get") {
      assert.equal(config.signal, signal)
      return success(config, { ...savedSettings, aiApiKey: secret, userId: user.userId, encryptedToken: secret })
    }
    return success(config, user.userId)
  }
  assert.deepEqual(await service.get(signal), savedSettings)
  assert.equal(await service.update({ dailyLeadLimit: 0, companyName: null, companyPitch: "", aiApiKey: "  ", scraperToken: null }), undefined)
  await service.update({ dailyLeadLimit: 2_147_483_647, companyName: " Company ", aiApiKey: ` ${secret} ` })
  assert.deepEqual(calls, [
    { method: "get", url: "/api/v1/settings", params: undefined, body: undefined },
    { method: "put", url: "/api/v1/settings", params: undefined, body: { dailyLeadLimit: 0, companyName: null, companyPitch: "" } },
    { method: "put", url: "/api/v1/settings", params: undefined, body: { dailyLeadLimit: 2_147_483_647, companyName: " Company ", aiApiKey: ` ${secret} ` } },
  ])
})

test("Settings rejects invalid writes and malformed responses without inventing success or defaults", async () => {
  let requests = 0
  api.defaults.adapter = async (config) => { requests++; return success(config, savedSettings) }
  for (const input of [{}, { dailyLeadLimit: null }, { dailyLeadLimit: -1 }, { dailyLeadLimit: 1.5 },
    { dailyLeadLimit: 2_147_483_648 }, { dailyLeadLimit: 1, userId: user.userId }, { dailyLeadLimit: 1, companyName: "a".repeat(101) }]) {
    await assert.rejects(service.update(input))
  }
  assert.equal(requests, 0)
  for (const data of [savedSettings, true, null, "not-a-guid"]) {
    api.defaults.adapter = async (config) => success(config, data)
    await assert.rejects(service.update({ dailyLeadLimit: 0 }))
  }
  for (const data of [{}, { ...savedSettings, dailyLeadLimit: null }, { ...savedSettings, maskedAIApiKey: undefined }]) {
    api.defaults.adapter = async (config) => success(config, data)
    await assert.rejects(service.get())
  }
})

test("settings credential writes require HTTPS and scrub request data and echoed errors", async () => {
  let configSeen, calls = 0
  const logged = [], originalLog = console.log
  console.log = (...args) => logged.push(args)
  try {
    api.defaults.adapter = async (config) => { configSeen = config; calls++; throw failure(config, 400, secret) }
    api.defaults.baseURL = "http://api.test"
    await assert.rejects(service.update({ dailyLeadLimit: 0, aiApiKey: secret }), (error) => error.message.includes("HTTPS"))
    assert.equal(calls, 0)
    api.defaults.baseURL = "https://api.test"
    await assert.rejects(service.update({ dailyLeadLimit: 0, aiApiKey: secret }), (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(JSON.stringify(error).includes(secret), false)
      assert.equal("cause" in error, false)
      return true
    })
    assert.equal(configSeen.data, undefined)
    api.defaults.adapter = async (config) => { configSeen = config; return success(config, user.userId) }
    await service.update({ dailyLeadLimit: 0, scraperToken: secret })
    assert.equal(configSeen.data, undefined)
    assert.deepEqual(logged, [])
  } finally { console.log = originalLog }
})

test("settings loads zero and masks, never prefills secrets, and preserves untouched company fields", async () => {
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push({ method: config.method, body: config.data ? JSON.parse(config.data) : undefined })
    return success(config, config.method === "get" ? savedSettings : user.userId)
  }
  mount()
  await screen.findByRole("form", { name: "User settings" })
  assert.equal(screen.getByLabelText("Daily message limit").value, "0")
  assert.equal(screen.getByLabelText("Company name").value, "")
  assert.equal(screen.getByLabelText("Replacement AI API key").value, "")
  assert.equal(screen.getByLabelText("Replacement scraper token").value, "")
  assert.match(document.body.textContent, /AI API key: \*{8}1234/)
  assert.equal(screen.queryByText(/no HTTP contract/), null)
  submit()
  await screen.findByText("Settings saved.")
  assert.deepEqual(calls, [{ method: "get", body: undefined }, { method: "put", body: { dailyLeadLimit: 0 } }, { method: "get", body: undefined }])
})

test("save locks duplicate submissions, clears replacement inputs while pending, refetches masks and invalidates quota", async (context) => {
  const gate = deferred(), bodies = []
  context.after(() => gate.resolve())
  let reads = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, ++reads === 1 ? savedSettings : { ...savedSettings, hasScraperToken: true, maskedScraperToken: "****5678", dailyLeadLimit: 12, companyName: " Company " })
    bodies.push(JSON.parse(config.data))
    await gate.promise
    return success(config, user.userId)
  }
  const { client } = mount()
  const preview = queryKeys.leads.messagingPreview(73)
  client.setQueryData(preview, { allowedToProcessCount: 0 })
  await screen.findByRole("form", { name: "User settings" })
  fireEvent.change(screen.getByLabelText("Daily message limit"), { target: { value: "12" } })
  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: " Company " } })
  fireEvent.change(screen.getByLabelText("Replacement scraper token"), { target: { value: secret } })
  submit(); submit()
  await waitFor(() => assert.equal(bodies.length, 1))
  assert.equal(screen.getByLabelText("Replacement scraper token").value, "")
  assert.equal(screen.getByRole("button", { name: "Saving settings…" }).disabled, true)
  assert.equal(JSON.stringify(client.getMutationCache().getAll().map((entry) => entry.state)).includes(secret), false)
  assert.equal(JSON.stringify(client.getQueryCache().getAll().map((entry) => entry.state.data)).includes(secret), false)
  await act(async () => { gate.resolve() })
  await screen.findByText("Settings saved.")
  assert.deepEqual(bodies, [{ dailyLeadLimit: 12, companyName: " Company ", scraperToken: secret }])
  assert.equal(reads, 2)
  assert.match(document.body.textContent, /Scraper token: \*{4}5678/)
  assert.equal(client.getQueryState(preview).isInvalidated, true)
  assert.deepEqual(client.getQueryData(preview), { allowedToProcessCount: 0 })
})

test("form rejects empty, negative, fractional, out-of-range limits and oversized company names", async () => {
  let writes = 0
  api.defaults.adapter = async (config) => { if (config.method === "put") writes++; return success(config, savedSettings) }
  mount()
  await screen.findByRole("form", { name: "User settings" })
  for (const value of ["", "-1", "1.5", "2147483648"]) {
    fireEvent.change(screen.getByLabelText("Daily message limit"), { target: { value } })
    submit()
    await screen.findByText("Enter a whole number from 0 through 2147483647.", { selector: '[role="alert"]' })
  }
  fireEvent.change(screen.getByLabelText("Daily message limit"), { target: { value: "0" } })
  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "x".repeat(101) } })
  submit()
  await screen.findByText("Company name must be 100 characters or fewer.")
  assert.equal(writes, 0)
})

test("failed save keeps company edits, clears secrets, shows a safe error, and permits explicit retry", async () => {
  let failed = true, writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, savedSettings)
    writes++
    if (failed) throw failure(config, 400, secret)
    return success(config, user.userId)
  }
  mount()
  await screen.findByRole("form", { name: "User settings" })
  fireEvent.change(screen.getByLabelText("Company pitch"), { target: { value: "Updated pitch" } })
  fireEvent.change(screen.getByLabelText("Replacement AI API key"), { target: { value: secret } })
  submit()
  await screen.findByRole("alert")
  assert.equal(screen.queryByText("Settings saved."), null)
  assert.equal(document.body.textContent.includes(secret), false)
  assert.equal(screen.getByLabelText("Company pitch").value, "Updated pitch")
  assert.equal(screen.getByLabelText("Replacement AI API key").value, "")
  assert.equal(writes, 1)
  failed = false
  submit()
  await screen.findByText("Settings saved.")
  assert.equal(writes, 2)
})

test("failed settings reads show retry without a stale editor, then accept server no-record defaults", async () => {
  let failed = true
  api.defaults.adapter = async (config) => {
    if (failed) throw failure(config, 403, "Access denied")
    return success(config, { ...savedSettings, hasAIApiKey: false, maskedAIApiKey: "", companyPitch: null })
  }
  mount()
  await screen.findByRole("alert")
  assert.equal(screen.queryByRole("form"), null)
  failed = false
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await screen.findByRole("form", { name: "User settings" })
  assert.equal(screen.getByLabelText("Daily message limit").value, "0")
  assert.match(document.body.textContent, /AI API key: Not configured/)
})

test("acknowledged save with failed refetch exposes read failure instead of caching the submitted values", async () => {
  let reads = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "put") return success(config, user.userId)
    if (++reads > 1) throw failure(config, 400, "Read unavailable")
    return success(config, savedSettings)
  }
  const { client } = mount()
  await screen.findByRole("form", { name: "User settings" })
  fireEvent.change(screen.getByLabelText("Daily message limit"), { target: { value: "15" } })
  submit()
  await screen.findByText("Unable to load current settings")
  assert.equal(screen.queryByRole("form"), null)
  assert.equal(client.getQueryData(queryKeys.settings.current).dailyLeadLimit, 0)
})

test("settings makes no requests for anonymous or administrative identities", async () => {
  let calls = 0
  api.defaults.adapter = async (config) => { calls++; return success(config, savedSettings) }
  const { client } = wrapper()
  for (const value of [{ ...auth, status: "anonymous", user: null }, { ...auth, realm: "admin", user: { ...user, role: "Admin" } }]) {
    const view = render(h(AuthContext.Provider, { value }, h(QueryClientProvider, { client }, h(SettingsPage))))
    assert.ok(screen.getByText("User settings unavailable"))
    assert.equal(screen.queryByRole("form"), null)
    view.unmount()
  }
  assert.equal(calls, 0)
})

test("old settings save cannot update the next principal's editor or cache", async () => {
  const gate = deferred()
  let current = savedSettings, writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, current)
    writes++
    await gate.promise
    return success(config, user.userId)
  }
  const tree = (identity) => h(AuthContext.Provider, { value: { ...auth, user: identity } }, h(QueryProvider, null, h(SettingsPage)))
  const view = render(tree(user))
  await screen.findByRole("form", { name: "User settings" })
  fireEvent.change(screen.getByLabelText("Daily message limit"), { target: { value: "20" } })
  submit()
  await waitFor(() => assert.equal(writes, 1))
  current = { ...savedSettings, dailyLeadLimit: 7 }
  view.rerender(tree({ ...user, userId: "new-owner" }))
  await waitFor(() => assert.equal(screen.getByLabelText("Daily message limit").value, "7"))
  await act(async () => { gate.resolve() })
  assert.equal(screen.getByLabelText("Daily message limit").value, "7")
  assert.equal(screen.queryByText("Settings saved."), null)
})

test("overview uses the unpaginated catalog count and leaves unsupported aggregates unavailable", async () => {
  const calls = []
  api.defaults.adapter = async (config) => { calls.push(config.url); return success(config, [bot, { ...bot, id: 74 }]) }
  mount(OverviewPage)
  await waitFor(() => assert.equal(screen.getByLabelText("Available bots: 2").textContent, "2"))
  assert.equal(screen.getByLabelText("Active workflows unavailable").textContent, "—")
  assert.equal(screen.getByLabelText("Runs today unavailable").textContent, "—")
  assert.ok(screen.getByText("Summary metrics unavailable"))
  assert.deepEqual(calls, ["/api/v1/bots"])
})

test("overview catalog failure retries to a truthful zero, without an aggregate endpoint", async () => {
  let failed = true
  api.defaults.adapter = async (config) => { if (failed) throw failure(config); return success(config, []) }
  mount(OverviewPage)
  await screen.findByRole("alert")
  assert.equal(screen.queryByLabelText("Available bots: 0"), null)
  failed = false
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await waitFor(() => assert.equal(screen.getByLabelText("Available bots: 0").textContent, "0"))
})

test("Bots preserves real independent reads, lifecycle and assignments without purchase or self-service actions", async () => {
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push(config.url)
    if (config.url.endsWith("/subscribed")) return success(config, [{ ...bot, id: 74, isActive: false, isSubscribed: true }])
    return success(config, [bot])
  }
  mount(BotsPage)
  const assigned = screen.getByRole("region", { name: "Subscribed bots" })
  await within(assigned).findByRole("link", { name: "Open workspace" })
  assert.match(assigned.textContent, /Inactive · Assigned to your account/)
  const catalog = screen.getByRole("region", { name: "Bot catalog" })
  await within(catalog).findByText("Subscription required")
  assert.equal(within(catalog).queryByRole("link"), null)
  assert.ok(screen.getByText(/Purchasing bots and changing subscriptions are unavailable here/))
  assert.equal(screen.queryByRole("button", { name: /purchase|subscribe|checkout/i }), null)
  assert.deepEqual(calls.sort(), ["/api/v1/bots", "/api/v1/bots/subscribed"])
})
