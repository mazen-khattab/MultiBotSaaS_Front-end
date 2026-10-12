import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { createServer } from "vite"

const h = React.createElement
let dom, server, api, service, Page, useMutations, queryKeys
let render, renderHook, screen, fireEvent, cleanup, waitFor, act, within
let originalAdapter, originalBaseUrl
const originalGlobals = new Map()
const clients = []
const secret = '[{"name":"c_user","value":"sensitive-test-cookie"}]'
const account = { id: 12, displayName: "Sales account", platform: "Facebook", expiredAt: "2026-10-25T14:30:00Z", isActive: true }
const details = { ...account, status: "CoolingDown", maskedCookies: "c_user=***", relatedLeadsCount: 150, runsCount: 14 }
const updateInput = { displayName: "New", platform: "Facebook", status: "Active", cookiesPayload: secret, isActive: true }
const success = (config, data) => ({ config, status: 200, statusText: "OK", headers: {}, data: { isSuccess: true, message: "", errorType: 0, data } })
const failure = (config, status = 400, message = "Invalid input") => new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, undefined, {
  config, status, statusText: "Error", headers: {}, data: { isSuccess: false, statusCode: status, message, path: config.url, method: config.method, traceId: "test" },
})

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173", pretendToBeVisual: true })
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
    MutationObserver: dom.window.MutationObserver, CustomEvent: dom.window.CustomEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, renderHook, screen, fireEvent, cleanup, waitFor, act, within } = await import("@testing-library/react/pure.js"))
  server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  ;({ api } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ ConnectedAccountsService: service } = await server.ssrLoadModule("/src/features/connected-accounts/services/ConnectedAccountsService.ts"))
  ;({ default: Page } = await server.ssrLoadModule("/src/features/connected-accounts/pages/ConnectedAccountsPage.tsx"))
  ;({ useConnectedAccountMutations: useMutations } = await server.ssrLoadModule("/src/features/connected-accounts/hooks/useConnectedAccountMutations.ts"))
  ;({ queryKeys } = await server.ssrLoadModule("/src/core/query/queryKeys.ts"))
  originalAdapter = api.defaults.adapter
  originalBaseUrl = api.defaults.baseURL
})

beforeEach(() => {
  api.defaults.baseURL = "https://backend.test"
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, config.url.endsWith("/12") ? details : [account])
    return success(config, true)
  }
})

afterEach(async () => {
  cleanup()
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  clients.splice(0).forEach((client) => client.clear())
  api.defaults.adapter = originalAdapter
})

after(async () => {
  api.defaults.baseURL = originalBaseUrl
  await server?.close()
  dom?.window.close()
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  return { client, Wrapper: ({ children }) => h(QueryClientProvider, { client }, children) }
}
function mount(botId = "73") {
  const { client, Wrapper } = wrapper()
  return { ...render(h(Page, { botId }), { wrapper: Wrapper }), client }
}
async function openCreate() {
  fireEvent.click(screen.getByRole("button", { name: "Add account" }))
  await screen.findByRole("form", { name: "Add connected account" })
  fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "New account" } })
  fireEvent.change(screen.getByLabelText("Platform"), { target: { value: "Facebook" } })
  fireEvent.change(screen.getByLabelText("Cookie payload"), { target: { value: secret } })
}

test("CRUD preserves bot-scoped reads, exact update status payloads, and credential auth", async () => {
  const calls = []
  const signal = new AbortController().signal
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, method: config.method, params: config.params, body: config.data ? JSON.parse(config.data) : undefined })
    assert.equal(config.withCredentials, true)
    assert.equal(config.headers.has("Authorization"), false)
    if (config.method === "get") {
      assert.equal(config.signal, signal)
      return success(config, config.url.endsWith("/12") ? { ...details, cookiesPayload: secret, botId: 73, status: "Busy" } : [{ ...account, cookiesPayload: secret }])
    }
    // Create/update response data is intentionally unspecified by the contract.
    return success(config, config.method === "delete" ? true : { undocumented: secret })
  }
  const list = await service.getAll(73, signal)
  assert.deepEqual(list, [{ id: 12, displayName: account.displayName, platform: "Facebook", expiresAt: account.expiredAt, isActive: true }])
  const detail = await service.getById(73, 12, signal)
  assert.equal(detail.expiresAt, account.expiredAt)
  assert.equal(detail.maskedCookies, "c_user=***")
  assert.equal(detail.status, "Busy")
  assert.equal("cookiesPayload" in detail || "botId" in detail || "expAt" in detail, false)
  await service.create({ botId: 73, displayName: "New", platform: "Facebook", cookiesPayload: secret })
  await service.update(12, { ...updateInput, displayName: "Renamed", isActive: false })
  await service.delete(12)
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ["get", "/api/v1/connectedaccounts/73"], ["get", "/api/v1/connectedaccounts/73/12"],
    ["post", "/api/v1/connectedaccounts"], ["put", "/api/v1/connectedaccounts/12"], ["delete", "/api/v1/connectedaccounts/12"],
  ])
  assert.equal(calls[0].params, undefined)
  assert.deepEqual(calls[2].body, { botId: 73, displayName: "New", platform: "Facebook", cookiesPayload: secret })
  assert.deepEqual(calls[3].body, { ...updateInput, displayName: "Renamed", isActive: false })
})

test("malformed, legacy, mismatched details and unsuccessful deletes are rejected", async () => {
  for (const data of [{ ...details, id: 13 }, { ...details, expiredAt: undefined, expAt: account.expiredAt }, { ...details, status: "Unknown" }]) {
    api.defaults.adapter = async (config) => success(config, data)
    await assert.rejects(service.getById(73, 12))
  }
  api.defaults.adapter = async (config) => success(config, false)
  await assert.rejects(service.delete(12))
  api.defaults.adapter = async (config) => success(config, {})
  await assert.rejects(service.getAll(73))
})

test("cookie writes require HTTPS and never reach an HTTP adapter", async () => {
  let calls = 0
  api.defaults.baseURL = "http://backend.test"
  api.defaults.adapter = async (config) => { calls++; return success(config, true) }
  await assert.rejects(async () => service.create({ botId: 73, displayName: "New", platform: "Facebook", cookiesPayload: secret }), (error) => error.message.includes("HTTPS"))
  await assert.rejects(async () => service.update(12, updateInput), (error) => error.message.includes("HTTPS"))
  assert.equal(calls, 0)
})

test("write failures cannot log or publish echoed cookie payloads and scrub retained request bodies", async () => {
  const messages = []
  const oldLog = console.log
  let configSeen
  console.log = (...args) => messages.push(args)
  try {
    api.defaults.adapter = async (config) => { configSeen = config; throw failure(config, 400, secret) }
    await assert.rejects(service.update(12, updateInput), (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(JSON.stringify(error).includes(secret), false)
      assert.equal("cause" in error, false)
      return true
    })
    assert.equal(configSeen.data, undefined)
    assert.deepEqual(messages, [])
  } finally {
    console.log = oldLog
  }
})

test("successful account updates do not log cookie payloads", async () => {
  const messages = []
  const oldLog = console.log
  let configSeen
  console.log = (...args) => messages.push(args)
  try {
    api.defaults.adapter = async (config) => { configSeen = config; return success(config, true) }
    await service.update(12, updateInput)
    assert.equal(configSeen.data, undefined)
    assert.deepEqual(messages, [])
  } finally {
    console.log = oldLog
  }
})

test("delete removes the account's details in all bot caches while preserving other accounts", async () => {
  const { client, Wrapper } = wrapper()
  const deletedKeys = [queryKeys.accounts.detail(12), queryKeys.accounts.detail(73, 12), queryKeys.accounts.detail(74, 12)]
  const remainingKey = queryKeys.accounts.detail(73, 13)
  for (const key of [...deletedKeys, remainingKey]) client.setQueryData(key, { prior: true })
  const { result } = renderHook(() => useMutations(), { wrapper: Wrapper })
  await act(async () => { await result.current.delete(12) })
  for (const key of deletedKeys) assert.equal(client.getQueryData(key), undefined)
  assert.deepEqual(client.getQueryData(remainingKey), { prior: true })
  assert.equal(client.getQueryState(remainingKey).isInvalidated, true)
})

test("bot-scoped account detail keys remain distinct and preserve existing bot and run keys", () => {
  assert.deepEqual(queryKeys.bots.detail(12), ["bots", "detail", 12])
  assert.deepEqual(queryKeys.runs.detail(12), ["runs", "detail", 12])
  assert.deepEqual(queryKeys.accounts.detail(73, 12), ["accounts", "detail", 12, 73])
  assert.deepEqual(queryKeys.accounts.detail(74, 12), ["accounts", "detail", 12, 74])
})

test("failed delete keeps cached details and reconciles them", async () => {
  const { client, Wrapper } = wrapper()
  const key = queryKeys.accounts.detail(73, 12)
  client.setQueryData(key, { prior: true })
  api.defaults.adapter = async (config) => { throw failure(config, 409) }
  const { result } = renderHook(() => useMutations(), { wrapper: Wrapper })
  await act(async () => { await assert.rejects(result.current.delete(12)) })
  assert.deepEqual(client.getQueryData(key), { prior: true })
  assert.equal(client.getQueryState(key).isInvalidated, true)
})

test("pending mutation variables contain no cookies, writes are locked, and all account queries reconcile", async () => {
  const { client, Wrapper } = wrapper()
  const keys = [queryKeys.accounts.list({ botId: 73 }), queryKeys.accounts.detail(73, 12), queryKeys.accounts.list({ purpose: "eligible", botId: 73 })]
  for (const key of keys) client.setQueryData(key, { prior: true })
  let finish, writeCalls = 0
  api.defaults.adapter = (config) => { writeCalls++; return new Promise((resolve) => { finish = () => resolve(success(config, true)) }) }
  const { result } = renderHook(() => useMutations(), { wrapper: Wrapper })
  let pending
  await act(async () => { pending = result.current.update(12, updateInput) })
  await waitFor(() => assert.equal(writeCalls, 1))
  assert.equal(JSON.stringify(client.getMutationCache().getAll().map((entry) => entry.state)).includes("sensitive-test-cookie"), false)
  await assert.rejects(result.current.delete(12), (error) => error.message.includes("already in progress"))
  await act(async () => { finish(); await pending })
  for (const key of keys) assert.equal(client.getQueryState(key).isInvalidated, true)
  assert.equal(writeCalls, 1)
})

test("page fetches bot-scoped masked details without exposing cookies", async () => {
  const { client } = mount()
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "View Sales account" }))
  await screen.findByText("c_user=***")
  assert.ok(screen.getByText("150"))
  assert.equal(document.body.textContent.includes(secret), false)
  assert.equal(client.getQueryData(queryKeys.accounts.detail(73, 12)).expiresAt, account.expiredAt)
})

test("create clears cookies before a pending request, blocks duplicate writes and dismissal, and refetches", async () => {
  let finish, posts = 0, reads = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") { reads++; return success(config, [account]) }
    posts++
    assert.equal(JSON.parse(config.data).botId, 73)
    return new Promise((resolve) => { finish = () => resolve(success(config, 99)) })
  }
  mount()
  await screen.findByText("Sales account")
  await openCreate()
  assert.equal(screen.queryByLabelText("Account status"), null)
  const input = screen.getByLabelText("Cookie payload")
  assert.equal(input.type, "password")
  const form = screen.getByRole("form", { name: "Add connected account" })
  fireEvent.submit(form)
  fireEvent.submit(form)
  await waitFor(() => assert.equal(posts, 1))
  assert.equal(input.value, "")
  assert.equal(screen.getByRole("button", { name: "Cancel" }).disabled, true)
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
  assert.ok(screen.getByRole("dialog"))
  await act(async () => { finish() })
  await screen.findByText("Connected account created.")
  assert.equal(screen.queryByRole("dialog"), null)
  assert.ok(reads >= 2)
})

test("failed create clears input, hides backend echoes and requires re-entry", async () => {
  let posts = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, [account])
    posts++; throw failure(config, 400, secret)
  }
  mount()
  await openCreate()
  fireEvent.click(screen.getByRole("button", { name: "Save account" }))
  await screen.findByText("The account was not saved. Review the name, platform, and cookie payload.")
  assert.equal(screen.getByLabelText("Cookie payload").value, "")
  assert.equal(screen.getByLabelText("Account name").value, "New account")
  assert.equal(document.body.textContent.includes(secret), false)
  fireEvent.click(screen.getByRole("button", { name: "Save account" }))
  await screen.findByText("Enter a cookie payload before saving.")
  assert.equal(posts, 1)
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
  fireEvent.click(screen.getByRole("button", { name: "Add account" }))
  assert.equal(screen.getByLabelText("Cookie payload").value, "")
})

test("edit initializes current status and saves the selected status, platform, cookies, and activation", async () => {
  let payload
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, config.url.endsWith("/12") ? { ...details, displayName: "Fresh detail name", isActive: false } : [account])
    assert.equal(config.method, "put")
    payload = JSON.parse(config.data)
    return success(config, true)
  }
  mount()
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "Edit Sales account" }))
  await screen.findByRole("form", { name: "Edit connected account" })
  assert.equal(screen.getByLabelText("Account name").value, "Fresh detail name")
  assert.equal(screen.getByLabelText("Enabled").checked, false)
  assert.equal(screen.getByLabelText("Account status").value, "CoolingDown")
  assert.deepEqual(Array.from(screen.getByLabelText("Account status").options).slice(1).map((option) => option.value), ["Active", "Busy", "CoolingDown", "AccountFlagged", "Banned"])
  fireEvent.change(screen.getByLabelText("Account status"), { target: { value: "Active" } })
  fireEvent.change(screen.getByLabelText("Platform"), { target: { value: "Updated platform" } })
  assert.equal(screen.getByLabelText("Replacement cookie payload").value, "")
  fireEvent.change(screen.getByLabelText("Replacement cookie payload"), { target: { value: secret } })
  fireEvent.click(screen.getByRole("button", { name: "Save account" }))
  await screen.findByText("Connected account updated.")
  assert.deepEqual(payload, { displayName: "Fresh detail name", platform: "Updated platform", status: "Active", cookiesPayload: secret, isActive: false })
})

test("edit waits for a fresh detail response before populating a previously cached account", async () => {
  const { client } = mount()
  client.setQueryData(queryKeys.accounts.detail(73, 12), { ...details, expiresAt: details.expiredAt, displayName: "Old cached name" })
  let finish
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("/12")) return new Promise((resolve) => { finish = () => resolve(success(config, { ...details, displayName: "Updated server name" })) })
    return success(config, [account])
  }
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "Edit Sales account" }))
  await waitFor(() => assert.equal(typeof finish, "function"))
  assert.equal(screen.queryByRole("form"), null)
  assert.ok(screen.getByText("Loading account details…"))
  await act(async () => { finish() })
  await screen.findByRole("form", { name: "Edit connected account" })
  assert.equal(screen.getByLabelText("Account name").value, "Updated server name")
})

test("missing detail status requires a selection without inferring status from activation", async () => {
  let writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, config.url.endsWith("/12") ? { ...details, status: undefined } : [account])
    writes++
    assert.equal(JSON.parse(config.data).status, "Banned")
    return success(config, true)
  }
  mount()
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "Edit Sales account" }))
  await screen.findByRole("form", { name: "Edit connected account" })
  assert.equal(screen.getByLabelText("Account status").value, "")
  assert.ok(screen.getByText(/The server did not return the current status/))
  fireEvent.change(screen.getByLabelText("Replacement cookie payload"), { target: { value: secret } })
  fireEvent.click(screen.getByRole("button", { name: "Save account" }))
  await screen.findByText("Select an account status.")
  assert.equal(writes, 0)
  fireEvent.change(screen.getByLabelText("Account status"), { target: { value: "Banned" } })
  fireEvent.click(screen.getByRole("button", { name: "Save account" }))
  await screen.findByText("Connected account updated.")
  assert.equal(writes, 1)
})

test("a rejected status change preserves selection and releases the edit form", async () => {
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, config.url.endsWith("/12") ? details : [account])
    throw failure(config, 409, "Status transition denied")
  }
  mount()
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "Edit Sales account" }))
  await screen.findByRole("form", { name: "Edit connected account" })
  fireEvent.change(screen.getByLabelText("Account status"), { target: { value: "Active" } })
  fireEvent.change(screen.getByLabelText("Replacement cookie payload"), { target: { value: secret } })
  fireEvent.click(screen.getByRole("button", { name: "Save account" }))
  await screen.findByText("The account could not be changed because of a conflict. Refresh and try again.")
  assert.equal(screen.getByLabelText("Account status").value, "Active")
  assert.equal(screen.getByLabelText("Account status").disabled, false)
  assert.equal(screen.getByLabelText("Replacement cookie payload").value, "")
  assert.equal(screen.getByRole("button", { name: "Save account" }).disabled, false)
})

test("delete waits for confirmation, removes cached detail and reconciles the account list", async () => {
  let deletes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "delete") { deletes++; return success(config, true) }
    return success(config, config.url.endsWith("/12") ? details : deletes ? [] : [account])
  }
  const { client } = mount()
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "Delete Sales account" }))
  const confirm = await screen.findByRole("button", { name: "Confirm delete" })
  assert.equal(deletes, 0)
  fireEvent.click(confirm)
  await screen.findByText("Connected account deleted.")
  await screen.findByText("No connected accounts")
  assert.equal(deletes, 1)
  assert.equal(client.getQueryData(queryKeys.accounts.detail(73, 12)), undefined)
})

test("failed delete preserves its safe error and account while allowing another attempt", async () => {
  api.defaults.adapter = async (config) => {
    if (config.method === "delete") throw failure(config, 409, "private diagnostic")
    return success(config, config.url.endsWith("/12") ? details : [account])
  }
  mount()
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "Delete Sales account" }))
  fireEvent.click(await screen.findByRole("button", { name: "Confirm delete" }))
  await screen.findByText("The account could not be changed because of a conflict. Refresh and try again.")
  assert.equal(screen.getByRole("button", { name: "Confirm delete" }).disabled, false)
  assert.equal(document.body.textContent.includes("private diagnostic"), false)
})

test("list failure retries to an empty state; detail failures expose retry without a form", async () => {
  let fail = true
  api.defaults.adapter = async (config) => { if (fail) throw failure(config, 404, "Accounts unavailable"); return success(config, []) }
  mount()
  await screen.findByText("Accounts unavailable")
  fail = false
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await screen.findByText("No connected accounts")
  cleanup()
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("/12")) throw failure(config, 404, "Account not found")
    return success(config, [account])
  }
  mount()
  await screen.findByText("Sales account")
  fireEvent.click(screen.getByRole("button", { name: "Edit Sales account" }))
  await screen.findByText("Account not found")
  assert.equal(screen.queryByRole("form"), null)
  assert.ok(within(screen.getByRole("dialog")).getByRole("button", { name: "Try again" }))
})

test("HTTP configuration disables cookie submission and changing bots discards unsubmitted secrets", async () => {
  api.defaults.baseURL = "http://backend.test"
  const { rerender } = mount()
  await openCreate()
  assert.equal(screen.getByRole("button", { name: "Save account" }).disabled, true)
  assert.ok(screen.getByText("Configure an HTTPS API URL before submitting account cookies."))
  rerender(h(Page, { botId: "74" }))
  assert.equal(screen.queryByRole("dialog"), null)
  fireEvent.click(screen.getByRole("button", { name: "Add account" }))
  assert.equal(screen.getByLabelText("Cookie payload").value, "")
  assert.ok(screen.getByText("New accounts are assigned to bot 74."))
})
