import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { MemoryRouter } from "react-router-dom"
import { createServer } from "vite"

const h = React.createElement
const user = { id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", fullName: "Regular customer", email: "customer@example.test",
  phoneNumber: "01012345678", isDeleted: false, createdAt: "2026-10-15T12:00:00" }
const bot = { id: 73, name: "Managed bot", description: null, currentPrice: 39.99, uiModuleCode: "FUTURE-CRM-2027",
  cooldownMinutes: 0, isActive: false, status: "Inactive" }
const assignment = { id: 91, userId: user.id, userFullName: user.fullName, userEmail: user.email, botId: bot.id,
  botName: bot.name, uiModuleCode: bot.uiModuleCode, purchasePrice: 0, purchaseDate: "2026-10-15T12:00:00", isActive: true }
const secret = "initial-test-password"
const page = (items, currentPage = 1, totalItems = items.length, totalPages = items.length ? 1 : 0) => ({ items, currentPage, totalItems, totalPages })
const success = (config, data) => ({ config, status: 200, statusText: "OK", headers: {}, data: { isSuccess: true, message: "Success", errorType: 0, data } })
const failure = (config, status, message = "Rejected") => new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined,
  { config, status, statusText: "Error", headers: {}, data: { isSuccess: false, statusCode: status, message, path: config.url, method: config.method, traceId: "test" } })
const deferred = () => { let resolve; const promise = new Promise((res) => { resolve = res }); return { promise, resolve } }
let dom, server, api, users, bots, subscriptions, UsersPage, BotsPage, SubscriptionsPage, OverviewPage, TransactionsPage, AuditPage
let useUserMutations, useSubscriptionMutations, adminKeys, queryKeys, coordinator, originalAdapter, originalBaseUrl
let render, renderHook, screen, fireEvent, cleanup, waitFor, act
const globals = new Map(), clients = []

// Real services, hooks, forms and dialogs run in JSDOM; only HTTP is replaced.
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173/admin", pretendToBeVisual: true })
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Element: dom.window.Element, Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter, MutationObserver: dom.window.MutationObserver, CustomEvent: dom.window.CustomEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, renderHook, screen, fireEvent, cleanup, waitFor, act } = await import("@testing-library/react/pure.js"))
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  ;({ api } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ UsersService: users } = await server.ssrLoadModule("/src/features/admin/users/UsersService.ts"))
  ;({ BotsService: bots } = await server.ssrLoadModule("/src/features/admin/bots/BotsService.ts"))
  ;({ SubscriptionsService: subscriptions } = await server.ssrLoadModule("/src/features/admin/subscriptions/SubscriptionsService.ts"))
  ;({ default: UsersPage } = await server.ssrLoadModule("/src/features/admin/users/AdminUsersPage.tsx"))
  ;({ default: BotsPage } = await server.ssrLoadModule("/src/features/admin/bots/AdminBotsPage.tsx"))
  ;({ default: SubscriptionsPage } = await server.ssrLoadModule("/src/features/admin/subscriptions/AdminSubscriptionsPage.tsx"))
  ;({ default: OverviewPage } = await server.ssrLoadModule("/src/features/admin/overview/AdminOverviewPage.tsx"))
  ;({ default: TransactionsPage } = await server.ssrLoadModule("/src/features/admin/transactions/AdminTransactionsPage.tsx"))
  ;({ default: AuditPage } = await server.ssrLoadModule("/src/features/admin/audit-logs/AdminAuditLogsPage.tsx"))
  ;({ useAdminUserMutations: useUserMutations } = await server.ssrLoadModule("/src/features/admin/users/useAdminUsers.ts"))
  ;({ useAdminSubscriptionMutations: useSubscriptionMutations } = await server.ssrLoadModule("/src/features/admin/subscriptions/useAdminSubscriptions.ts"))
  ;({ adminKeys } = await server.ssrLoadModule("/src/features/admin/shared/adminContracts.ts"))
  ;({ queryKeys } = await server.ssrLoadModule("/src/core/query/queryKeys.ts"))
  ;({ refreshCoordinator: coordinator } = await server.ssrLoadModule("/src/core/api/refreshCoordinator.ts"))
  originalAdapter = api.defaults.adapter
  originalBaseUrl = api.defaults.baseURL
})
beforeEach(() => {
  coordinator.setSessionRealm("admin")
  api.defaults.baseURL = "https://api.test"
  api.defaults.adapter = async (config) => {
    const item = config.url.includes("/users") ? user : config.url.includes("/bots") ? bot : assignment
    return success(config, config.method === "delete" ? true : config.method === "get" && !/\/(?:\d+|[\da-f-]{36})$/.test(config.url)
      ? page([item]) : item)
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
  return { client, Wrapper: ({ children }) => h(QueryClientProvider, { client }, h(MemoryRouter, null, children)) }
}
function mount(Page) {
  const { client, Wrapper } = wrapper()
  return { ...render(h(Page), { wrapper: Wrapper }), client }
}
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const submit = (label) => fireEvent.submit(screen.getByRole("form", { name: label }))

test("all admin services use exact management routes, cookie credentials, pagination and safe DTOs", async () => {
  const calls = [], signal = new AbortController().signal
  api.defaults.adapter = async (config) => {
    assert.equal(config.withCredentials, true)
    assert.equal(config.headers.has("Authorization"), false)
    assert.equal(config.headers.has("x-worker-api-key"), false)
    calls.push({ method: config.method, url: config.url, params: config.params, body: config.data ? JSON.parse(config.data) : undefined })
    const item = config.url.includes("/users") ? user : config.url.includes("/bots") ? bot : assignment
    if (config.method === "get") assert.equal(config.signal, signal)
    return success(config, config.method === "delete" ? true : config.method === "get" && Object.keys(config.params ?? {}).length
      ? page([{ ...item, passwordHash: secret }]) : { ...item, passwordHash: secret })
  }
  assert.deepEqual(await users.list({ pageNumber: 2, pageSize: 25, search: "customer", isDeleted: false }, signal), page([user]))
  assert.deepEqual(await users.detail(user.id, signal), user)
  assert.deepEqual(await users.create({ fullName: user.fullName, email: user.email, password: secret }), user)
  await users.update(user.id, { fullName: user.fullName, email: user.email, phoneNumber: "" })
  await users.setDeactivated(user.id, true); await users.setDeactivated(user.id, false)
  assert.deepEqual(await bots.list({ isActive: false, search: "CRM" }, signal), page([bot]))
  assert.deepEqual(await bots.detail(bot.id, signal), bot)
  await bots.create({ name: "Future", uiModuleCode: " future-crm-2028 ", currentPrice: 0, cooldownMinutes: 0 })
  await bots.update(bot.id, { name: "Updated", description: null, currentPrice: 39.99, cooldownMinutes: 0 })
  await bots.setActive(bot.id, true); await bots.setActive(bot.id, false)
  assert.deepEqual(await subscriptions.list({ userId: user.id, botId: bot.id, isActive: true }, signal), page([assignment]))
  assert.deepEqual(await subscriptions.detail(assignment.id, signal), assignment)
  assert.deepEqual(await subscriptions.assign({ userId: user.id, botId: bot.id }), assignment)
  await subscriptions.remove(assignment.id)
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ["get", "/api/v1/admin/users"], ["get", `/api/v1/admin/users/${user.id}`], ["post", "/api/v1/admin/users"],
    ["put", `/api/v1/admin/users/${user.id}`], ["put", `/api/v1/admin/users/${user.id}/deactivate`], ["put", `/api/v1/admin/users/${user.id}/reactivate`],
    ["get", "/api/v1/admin/bots"], ["get", "/api/v1/admin/bots/73"], ["post", "/api/v1/admin/bots"], ["put", "/api/v1/admin/bots/73"],
    ["put", "/api/v1/admin/bots/73/activate"], ["put", "/api/v1/admin/bots/73/deactivate"],
    ["get", "/api/v1/admin/subscriptions"], ["get", "/api/v1/admin/subscriptions/91"], ["post", "/api/v1/admin/subscriptions"], ["delete", "/api/v1/admin/subscriptions/91"],
  ])
  assert.deepEqual(calls[0].params, { pageNumber: 2, pageSize: 25, search: "customer", isDeleted: false })
  assert.deepEqual(calls[2].body, { fullName: user.fullName, email: user.email, phoneNumber: "", password: secret })
  assert.deepEqual(calls[3].body, { fullName: user.fullName, email: user.email, phoneNumber: "" })
  assert.equal(calls[4].body, undefined)
  assert.deepEqual(calls[8].body, { name: "Future", uiModuleCode: "FUTURE-CRM-2028", currentPrice: 0, cooldownMinutes: 0 })
  assert.deepEqual(calls[14].body, { userId: user.id, botId: bot.id })
})

test("invalid or unsupported admin fields fail before HTTP and malformed server results never become success", async () => {
  let requests = 0
  api.defaults.adapter = async (config) => { requests++; return success(config, {}) }
  for (const write of [
    () => users.create({ fullName: "", email: user.email, password: secret }),
    () => users.create({ fullName: user.fullName, email: user.email, password: secret, role: "Admin" }),
    () => users.update(user.id, { fullName: user.fullName, email: user.email, phoneNumber: null }),
    () => users.update(user.id, { fullName: user.fullName, email: user.email, phoneNumber: "", password: secret }),
    () => bots.create({ name: "New", currentPrice: -1, uiModuleCode: "CODE" }),
    () => bots.create({ name: "New", currentPrice: 1.234, uiModuleCode: "CODE" }),
    () => bots.create({ name: "New", currentPrice: 0.0000001, uiModuleCode: "CODE" }),
    () => bots.create({ name: "New", currentPrice: 0, uiModuleCode: "INVALID_CODE" }),
    () => bots.update(bot.id, { name: "New", currentPrice: 0, isActive: true }),
    () => subscriptions.assign({ userId: user.id, botId: bot.id, purchasePrice: 0 }),
    () => subscriptions.assign({ userId: "bad-id", botId: bot.id }),
    () => subscriptions.remove(-1), () => bots.detail(1.5), () => users.list({ pageSize: 101 }),
  ]) await assert.rejects(write())
  assert.equal(requests, 0)
  for (const service of [users, bots, subscriptions]) await assert.rejects(service.list())
  for (const [service, id, item] of [[users, user.id, user], [bots, bot.id, bot], [subscriptions, assignment.id, assignment]]) {
    api.defaults.adapter = async (config) => success(config, { ...item, id: service === users ? "118d92fb-a1db-42f6-a71d-1c7be8ea8f01" : 999 })
    await assert.rejects(service.detail(id))
  }
  api.defaults.adapter = async (config) => success(config, false)
  await assert.rejects(subscriptions.remove(assignment.id))
  api.defaults.adapter = async (config) => ({ ...success(config, user), data: { isSuccess: false, message: "Rejected", errorType: 5, data: null } })
  await assert.rejects(users.create({ fullName: user.fullName, email: user.email, password: secret }))
})

test("management 401s share admin refresh and replay, while 403s preserve backend role denial", async () => {
  const calls = []
  let refreshed = false
  api.defaults.adapter = async (config) => {
    calls.push(config.url)
    if (config.url === "/api/v1/admin/auth/refresh") {
      refreshed = true
      return success(config, { userId: user.id, email: "admin@example.test", name: "Admin", role: "Admin" })
    }
    if (!refreshed) throw failure(config, 401)
    return success(config, page([config.url.endsWith("/users") ? user : bot]))
  }
  await Promise.all([users.list(), bots.list()])
  assert.equal(calls.filter((url) => url === "/api/v1/admin/auth/refresh").length, 1)
  assert.equal(calls.includes("/api/v1/auth/refresh"), false)
  api.defaults.adapter = async (config) => { throw failure(config, 403, "Administrative role has changed.") }
  await assert.rejects(bots.list(), (error) => error.statusCode === 403 && error.message.includes("role has changed"))
})

test("write hooks block duplicates, reconcile related admin reads and keep passwords out of caches", async (context) => {
  const gate = deferred(); context.after(() => gate.resolve())
  let writes = 0, configSeen
  const { client, Wrapper } = wrapper()
  const keys = [adminKeys("users").list({}), adminKeys("users").detail(user.id), adminKeys("subscriptions").list({})]
  keys.forEach((key) => client.setQueryData(key, { stale: true }))
  client.setQueryData(queryKeys.bots.list(), ["client-session"])
  api.defaults.adapter = async (config) => { configSeen = config; writes++; await gate.promise; return success(config, user) }
  const { result } = renderHook(() => useUserMutations(), { wrapper: Wrapper })
  let pending
  await act(async () => { pending = result.current.create({ fullName: user.fullName, email: user.email, password: secret }) })
  await assert.rejects(result.current.create({ fullName: user.fullName, email: user.email, password: secret }))
  assert.equal(writes, 1)
  assert.equal(JSON.stringify(client.getMutationCache().getAll().map((entry) => entry.state)).includes(secret), false)
  await act(async () => { gate.resolve(); await pending })
  assert.equal(configSeen.data, undefined)
  assert.ok(keys.every((key) => client.getQueryState(key).isInvalidated))
  assert.deepEqual(client.getQueryData(queryKeys.bots.list()), ["client-session"])
  assert.equal(JSON.stringify(client.getQueryCache().getAll().map((entry) => entry.state)).includes(secret), false)
})

test("failed user creation cannot echo a password and failed removals retain details without retries", async () => {
  let configSeen, calls = 0
  api.defaults.adapter = async (config) => { configSeen = config; calls++; throw failure(config, 400, secret) }
  await assert.rejects(users.create({ fullName: user.fullName, email: user.email, password: secret }), (error) => !JSON.stringify(error).includes(secret))
  assert.equal(configSeen.data, undefined)
  const { client, Wrapper } = wrapper()
  const key = adminKeys("subscriptions").detail(assignment.id)
  client.setQueryData(key, assignment)
  const { result } = renderHook(() => useSubscriptionMutations(), { wrapper: Wrapper })
  await act(async () => { await assert.rejects(result.current.remove(assignment.id)) })
  assert.equal(calls, 2)
  assert.deepEqual(client.getQueryData(key), assignment)
  assert.equal(client.getQueryState(key).isInvalidated, true)
  api.defaults.adapter = async (config) => success(config, true)
  await act(async () => { await result.current.remove(assignment.id) })
  assert.equal(client.getQueryState(key), undefined)
})

test("user list honors server pagination and combined filters, and editing excludes passwords and roles", async () => {
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push({ method: config.method, params: config.params, body: config.data ? JSON.parse(config.data) : undefined })
    return success(config, config.params ? page([user], config.params.pageNumber, 42, 5) : user)
  }
  mount(UsersPage)
  await screen.findByText(user.fullName)
  assert.equal(screen.queryByRole("button", { name: /Delete/i }), null)
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  await waitFor(() => assert.equal(calls.at(-1).params.pageNumber, 2))
  change("Search", "customer"); change("User status", "inactive"); submit("List filters")
  await waitFor(() => assert.deepEqual(calls.at(-1).params, { pageNumber: 1, pageSize: 10, search: "customer", isDeleted: true }))
  fireEvent.click(screen.getByRole("button", { name: "Edit" }))
  await screen.findByRole("form", { name: "Edit user" })
  assert.equal(screen.queryByLabelText("Initial password"), null)
  change("Phone number", ""); submit("Edit user")
  await screen.findByText("User updated.")
  assert.deepEqual(calls.find((call) => call.method === "put").body, { fullName: user.fullName, email: user.email, phoneNumber: "" })
})

test("user creation validates inputs and announces success only after a server acknowledgment", async () => {
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push({ method: config.method, body: config.data ? JSON.parse(config.data) : undefined })
    return success(config, config.method === "get" ? page([user]) : user)
  }
  mount(UsersPage)
  fireEvent.click(screen.getByRole("button", { name: "Create user" }))
  await screen.findByRole("form", { name: "Create user" })
  submit("Create user")
  await screen.findAllByRole("alert")
  assert.equal(calls.filter((call) => call.method === "post").length, 0)
  change("Full name", "New customer"); change("Email", "new@example.test"); change("Initial password", secret)
  assert.equal(screen.getByLabelText("Initial password").type, "password")
  submit("Create user"); submit("Create user")
  await screen.findByText("User created.")
  assert.equal(calls.filter((call) => call.method === "post").length, 1)
  assert.deepEqual(calls.find((call) => call.method === "post").body, { fullName: "New customer", email: "new@example.test", phoneNumber: "", password: secret })
})

test("deactivation and reactivation require fresh details and call the dedicated endpoints", async () => {
  let current = user
  const writes = []
  api.defaults.adapter = async (config) => {
    if (config.method === "put") { writes.push(config.url); current = { ...current, isDeleted: config.url.endsWith("/deactivate") }; return success(config, current) }
    return success(config, config.params ? page([current]) : current)
  }
  mount(UsersPage)
  await screen.findByText(user.fullName)
  fireEvent.click(screen.getByRole("button", { name: "Deactivate" }))
  fireEvent.click(await screen.findByRole("button", { name: "Confirm deactivation" }))
  await screen.findByText("User deactivated.")
  fireEvent.click(screen.getByRole("button", { name: "Reactivate" }))
  fireEvent.click(await screen.findByRole("button", { name: "Confirm reactivation" }))
  await screen.findByText("User reactivated.")
  assert.deepEqual(writes, [`/api/v1/admin/users/${user.id}/deactivate`, `/api/v1/admin/users/${user.id}/reactivate`])
})

test("bot edits omit immutable module codes, keep zero cooldown and do not offer delete", async () => {
  const writes = []
  api.defaults.adapter = async (config) => {
    if (config.method === "put") writes.push(JSON.parse(config.data))
    return success(config, config.params ? page([bot]) : bot)
  }
  mount(BotsPage)
  await screen.findByText(bot.name)
  assert.equal(screen.queryByRole("button", { name: /Delete/i }), null)
  fireEvent.click(screen.getByRole("button", { name: "Edit" }))
  await screen.findByRole("form", { name: "Edit bot" })
  assert.equal(screen.getByLabelText("UI module code").disabled, true)
  assert.equal(screen.getByLabelText("Cooldown minutes").value, "0")
  change("Catalog price", "0"); submit("Edit bot")
  await screen.findByText("Bot updated.")
  assert.deepEqual(writes, [{ name: bot.name, description: null, currentPrice: 0, cooldownMinutes: 0 }])
})

test("bot creation accepts a new dynamic code, starts inactive, then activates separately", async () => {
  let current = bot
  const writes = []
  api.defaults.adapter = async (config) => {
    if (config.method !== "get") {
      writes.push({ method: config.method, url: config.url, body: config.data ? JSON.parse(config.data) : undefined })
      if (config.method === "post") current = { ...bot, ...JSON.parse(config.data) }
      else current = { ...current, isActive: true, status: "Active" }
    }
    return success(config, config.params ? page([current]) : current)
  }
  mount(BotsPage)
  fireEvent.click(screen.getByRole("button", { name: "Create bot" }))
  await screen.findByRole("form", { name: "Create bot" })
  change("Bot name", "Future CRM"); change("UI module code", " future-crm-2028 ")
  change("Cooldown minutes", "0"); submit("Create bot")
  await screen.findByText("Bot created inactive.")
  assert.deepEqual(writes[0].body, { name: "Future CRM", description: "", currentPrice: 0, uiModuleCode: "FUTURE-CRM-2028", cooldownMinutes: 0 })
  fireEvent.click(screen.getByRole("button", { name: "Activate" }))
  await screen.findByText(/Confirm frontend support for FUTURE-CRM-2028 is deployed/)
  fireEvent.click(screen.getByRole("button", { name: "Confirm activation" }))
  await screen.findByText("Bot activated.")
  assert.deepEqual(writes[1], { method: "put", url: "/api/v1/admin/bots/73/activate", body: undefined })
})

test("assignment form sends only user and bot IDs and removal uses the assignment ID", async () => {
  let current = [assignment]
  const writes = []
  api.defaults.adapter = async (config) => {
    if (config.method !== "get") {
      writes.push({ method: config.method, url: config.url, body: config.data ? JSON.parse(config.data) : undefined })
      if (config.method === "delete") { current = []; return success(config, true) }
    }
    return success(config, config.params ? page(current) : assignment)
  }
  mount(SubscriptionsPage)
  fireEvent.click(screen.getByRole("button", { name: "Assign bot" }))
  await screen.findByRole("form", { name: "Assign bot" })
  change("User ID", user.id); change("Bot ID", "73"); submit("Assign bot")
  await screen.findByText("Bot assigned.")
  assert.deepEqual(writes[0].body, { userId: user.id, botId: 73 })
  fireEvent.click(screen.getByRole("button", { name: "Remove assignment" }))
  await screen.findByText(/Reassigning creates a new relationship/)
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }))
  await screen.findByText("Assignment removed.")
  assert.deepEqual(writes[1], { method: "delete", url: "/api/v1/admin/subscriptions/91", body: undefined })
  assert.equal(screen.queryByText(assignment.userFullName), null)
})

test("assignment filters reject invalid IDs and never pretend removed rows are inactive history", async () => {
  const calls = []
  api.defaults.adapter = async (config) => { calls.push(config.params); return success(config, page([assignment])) }
  mount(SubscriptionsPage)
  await screen.findByText(assignment.userFullName)
  change("Filter by user ID", "bad-guid"); submit("Assignment filters")
  await screen.findByRole("alert")
  assert.equal(calls.length, 1)
  change("Filter by user ID", user.id); change("Filter by bot ID", "73"); submit("Assignment filters")
  await waitFor(() => assert.deepEqual(calls.at(-1), { userId: user.id, botId: 73, pageNumber: 1, pageSize: 10 }))
  assert.equal(screen.queryByRole("button", { name: /pause|renew|checkout|restore/i }), null)
  assert.match(document.body.textContent, /no inactive history/)
})

test("duplicate assignments and failed writes show real errors without success messages", async () => {
  let writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "post") { writes++; throw failure(config, 409, "User is already assigned to this bot.") }
    return success(config, page([assignment]))
  }
  mount(SubscriptionsPage)
  fireEvent.click(screen.getByRole("button", { name: "Assign bot" }))
  await screen.findByRole("form", { name: "Assign bot" })
  change("User ID", user.id); change("Bot ID", "73"); submit("Assign bot")
  await screen.findByText("User is already assigned to this bot.")
  assert.equal(screen.queryByText("Bot assigned."), null)
  assert.equal(writes, 1)
  assert.equal(screen.getByLabelText("User ID").value, user.id)
})

test("list failures can retry and empty pages retain truthful server totals", async () => {
  let failed = true
  api.defaults.adapter = async (config) => {
    if (failed) throw failure(config, 403, "Administrative role has changed.")
    return success(config, page([]))
  }
  mount(BotsPage)
  await screen.findByText("Administrative role has changed.")
  assert.equal(screen.queryByText(bot.name), null)
  failed = false
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await screen.findByText(/0 items/)
  assert.equal(screen.getByRole("button", { name: "Next" }).disabled, true)
})

test("unavailable admin areas make no HTTP requests and the overview links to real management features", () => {
  let calls = 0
  api.defaults.adapter = async () => { calls++; throw new Error("Unavailable areas must not request data") }
  for (const Page of [TransactionsPage, AuditPage, OverviewPage]) {
    const view = mount(Page)
    assert.ok(screen.getAllByText("Backend capability unavailable").length >= 1)
    assert.equal(screen.queryByRole("button"), null)
    if (Page === OverviewPage) {
      assert.equal(screen.getByRole("link", { name: /Users/ }).getAttribute("href"), "/admin/users")
      assert.equal(screen.getByRole("link", { name: /Bots/ }).getAttribute("href"), "/admin/bots")
      assert.equal(screen.getByRole("link", { name: /Subscriptions/ }).getAttribute("href"), "/admin/subscriptions")
    }
    view.unmount()
  }
  assert.equal(calls, 0)
})
