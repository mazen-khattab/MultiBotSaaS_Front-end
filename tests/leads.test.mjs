import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { QueryClient, QueryClientProvider, hashKey } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { MemoryRouter } from "react-router-dom"
import { createServer } from "vite"

const h = React.createElement
let dom, server, api, service, LeadsPage, PreviewPage, useLeads, useDispatch, queryKeys, adapt, presentation
let render, renderHook, screen, fireEvent, cleanup, waitFor, act, within
let originalAdapter
const originalGlobals = new Map()
const clients = []
const lead = {
  leadId: 101, leadFormattedId: "LED-#101", profileName: "List recipient", profileUrl: "https://example.test/list-profile",
  aiMessage: "Hello from the list", fromGroup: "Founders group", status: "Pending", createdAt: "2026-10-14T12:30:00Z",
}
const previewLead = { leadId: 201, leadNumber: "LED-#201", profileName: "Preview recipient", profileUrl: "https://example.test/preview-profile", aiMessage: "Hello from the preview", status: "Pending" }
const preview = { dailyMessageLimit: 30, messagesSent: 5, allowedToProcessCount: 25, leads: [previewLead] }
const account = { id: 12, displayName: "Eligible account", platform: "Facebook", expiredAt: "2026-10-25T14:30:00Z", isActive: true }
const acknowledgment = { jobId: 85, status: "Pending", totalLeadsCount: 1 }
const page = (items = [lead], currentPage = 1, totalItems = 42, totalPages = 5) => ({ items, currentPage, totalItems, totalPages })
const success = (config, data) => ({ config, status: 200, statusText: "OK", headers: {}, data: { isSuccess: true, message: "", errorType: 0, data } })
const failure = (config, message, status = 400) => new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, undefined, {
  config, status, statusText: "Error", headers: {}, data: { isSuccess: false, statusCode: status, message, path: config.url, method: config.method, traceId: "test" },
})

// Real services and components run against a test-only HTTP transport.
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
  ;({ LeadsService: service } = await server.ssrLoadModule("/src/features/leads/services/LeadsService.ts"))
  ;({ default: LeadsPage } = await server.ssrLoadModule("/src/features/leads/pages/LeadsPage.tsx"))
  ;({ default: PreviewPage } = await server.ssrLoadModule("/src/features/leads/pages/MessagingPreviewPage.tsx"))
  ;({ useLeads } = await server.ssrLoadModule("/src/features/leads/hooks/useLeads.ts"))
  ;({ useDispatchMessages: useDispatch } = await server.ssrLoadModule("/src/features/leads/hooks/useDispatchMessages.ts"))
  ;({ queryKeys } = await server.ssrLoadModule("/src/core/query/queryKeys.ts"))
  ;({ toDispatchMessagingDto: adapt } = await server.ssrLoadModule("/src/features/leads/adapters/dispatchMessagingAdapter.ts"))
  presentation = await server.ssrLoadModule("/src/features/leads/components/leadPresentation.ts")
  originalAdapter = api.defaults.adapter
})

function defaultResponse(config) {
  if (config.url.includes("/eligible/")) return success(config, [account])
  if (config.url.includes("/messaging-preview/")) return success(config, preview)
  if (config.method === "post") return success(config, acknowledgment)
  return success(config, page([lead], config.params.pageNumber))
}

beforeEach(() => { api.defaults.adapter = async (config) => defaultResponse(config) })
afterEach(async () => {
  cleanup()
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  clients.splice(0).forEach((client) => client.clear())
  api.defaults.adapter = originalAdapter
})
after(async () => {
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
  return { client, Wrapper: ({ children }) => h(QueryClientProvider, { client }, h(MemoryRouter, null, children)) }
}
function mount(Component = LeadsPage, botId = "73") {
  const { client, Wrapper } = wrapper()
  return { ...render(h(Component, { botId }), { wrapper: Wrapper }), client }
}
async function openPicker() {
  await screen.findByText(previewLead.profileName)
  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Send message" }).disabled, false))
  fireEvent.click(screen.getByRole("button", { name: "Send message" }))
  await screen.findByRole("dialog")
  await waitFor(() => assert.equal(screen.getByLabelText("Connected account").disabled, false))
  fireEvent.change(screen.getByLabelText("Connected account"), { target: { value: "12" } })
}

test("services use authoritative DTOs and mixed route prefixes with cookies, aborts, and no worker key", async () => {
  const calls = []
  const signal = new AbortController().signal
  api.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, params: config.params, body: config.data ? JSON.parse(config.data) : undefined })
    assert.equal(config.withCredentials, true)
    assert.equal(config.headers.has("Authorization"), false)
    assert.equal(config.headers.has("x-worker-api-key"), false)
    if (config.method === "get") assert.equal(config.signal, signal)
    if (config.url.includes("messaging-preview")) return success(config, { ...preview, extra: "ignored", leads: [{ ...previewLead, fromGroup: "ignored" }] })
    if (config.method === "post") return success(config, { ...acknowledgment, extra: "ignored" })
    return success(config, { ...page([{ ...lead, userId: "ignored" }]), extra: "ignored" })
  }
  const params = { botId: 73, pageNumber: 2, pageSize: 25, statusFilter: "Arbitrary status" }
  assert.deepEqual(await service.getLeads(params, signal), page())
  assert.deepEqual(await service.getMessagingPreview(73, signal), preview)
  assert.deepEqual(await service.dispatchMessages({ botId: 73, accountId: 12, leadIds: [201], extra: "ignored" }), acknowledgment)
  assert.deepEqual(calls, [
    { method: "get", url: "/api/leads/leads/73", params: { pageNumber: 2, pageSize: 25, statusFilter: "Arbitrary status" }, body: undefined },
    { method: "get", url: "/api/leads/bot/messaging-preview/73", params: undefined, body: undefined },
    { method: "post", url: "/api/v1/worker/dispatch-messaging", params: undefined, body: { botId: 73, accountId: 12, leadIds: [201] } },
  ])
})

test("invalid and historical response shapes never enter the lead or quota cache", async () => {
  for (const data of [null, [], page([{ ...lead, leadId: undefined, id: 101 }]), page([{ ...lead, leadId: Number.MAX_SAFE_INTEGER + 1 }]), page([lead], 0), page([{ ...lead, aiMessage: null }])]) {
    api.defaults.adapter = async (config) => success(config, data)
    await assert.rejects(service.getLeads({ botId: 73, pageNumber: 1, pageSize: 10 }))
  }
  for (const data of [[previewLead], { ...preview, allowedToProcessCount: -1 }, { ...preview, leads: [lead] }, { ...preview, messagesSent: undefined }]) {
    api.defaults.adapter = async (config) => success(config, data)
    await assert.rejects(service.getMessagingPreview(73))
  }
  for (const data of [true, { ...acknowledgment, jobId: 0 }]) {
    api.defaults.adapter = async (config) => success(config, data)
    await assert.rejects(service.dispatchMessages({ botId: 73, accountId: 12, leadIds: [201] }))
  }
})

test("dispatch and bot validation reject invalid IDs before issuing requests", async () => {
  let calls = 0
  api.defaults.adapter = async (config) => { calls++; return defaultResponse(config) }
  for (const leadIds of [[], [0], [1.5], [Number.MAX_SAFE_INTEGER + 1]]) await assert.rejects(service.dispatchMessages({ botId: 73, accountId: 12, leadIds }))
  await assert.rejects(service.dispatchMessages({ botId: 73, accountId: -1, leadIds: [201] }))
  await assert.rejects(service.getMessagingPreview(-1))
  await assert.rejects(service.getLeads({ botId: 1.2, pageNumber: 1, pageSize: 10 }))
  assert.equal(calls, 0)
})

test("query keys distinguish every server parameter and the quota response shape", async () => {
  const params = { botId: 73, pageNumber: 1, pageSize: 10, statusFilter: undefined }
  const variants = [params, { ...params, botId: 74 }, { ...params, pageNumber: 2 }, { ...params, pageSize: 25 }, { ...params, statusFilter: "Any status" }]
  const { client, Wrapper } = wrapper()
  const { result, rerender } = renderHook((input) => useLeads(input), { initialProps: params, wrapper: Wrapper })
  for (const variant of variants) {
    rerender(variant)
    await waitFor(() => assert.equal(result.current.isSuccess, true))
    assert.ok(client.getQueryData(queryKeys.leads.list({ ...variant })))
  }
  const hashes = variants.map((variant) => hashKey(queryKeys.leads.list(variant)))
  hashes.push(hashKey(queryKeys.leads.messagingPreview(73)), hashKey(queryKeys.leads.messagingPreview(74)))
  assert.equal(new Set(hashes).size, hashes.length)
})

test("lead table shows exact supplied fields and safe profiles without unsupported controls", async () => {
  mount()
  const table = await screen.findByRole("table", { name: "Bot leads" })
  await within(table).findByText(lead.profileName)
  for (const value of [lead.leadFormattedId, lead.aiMessage, lead.fromGroup, lead.status]) assert.ok(within(table).getByText(value))
  const link = within(table).getByRole("link", { name: lead.profileUrl })
  assert.equal(link.getAttribute("href"), lead.profileUrl)
  assert.equal(link.getAttribute("rel"), "noopener noreferrer")
  assert.equal(within(table).queryByRole("button"), null)
  assert.equal(screen.queryByRole("searchbox"), null)
  assert.equal(screen.queryByRole("button", { name: /export|sort|view lead/i }), null)
  assert.equal(screen.getByRole("link", { name: "Available leads" }).getAttribute("href"), "/dashboard/bots/73/messaging-preview")
})

test("pagination, page size, arbitrary status, and clearing status send server params and reset page", async () => {
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, params: config.params })
    return success(config, page([{ ...lead, profileName: `Page ${config.params.pageNumber}` }], config.params.pageNumber))
  }
  mount()
  await screen.findByText("Page 1")
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  await screen.findByText("Page 2")
  fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "25" } })
  await screen.findByText("Page 1")
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  await screen.findByText("Page 2")
  fireEvent.change(screen.getByLabelText("Lead status"), { target: { value: "  Arbitrary status  " } })
  assert.equal(calls.length, 4)
  fireEvent.click(screen.getByRole("button", { name: "Apply filter" }))
  await screen.findByText("Page 1")
  assert.equal(calls.at(-1).params.statusFilter, "Arbitrary status")
  // Display the server row even when its status differs; no client filtering.
  assert.ok(screen.getByText("Pending"))
  fireEvent.click(screen.getByRole("button", { name: "Clear filter" }))
  await waitFor(() => assert.equal(calls.length, 6))
  assert.deepEqual(calls.map(({ params }) => params), [
    { pageNumber: 1, pageSize: 10 }, { pageNumber: 2, pageSize: 10 },
    { pageNumber: 1, pageSize: 25 }, { pageNumber: 2, pageSize: 25 },
    { pageNumber: 1, pageSize: 25, statusFilter: "Arbitrary status" }, { pageNumber: 1, pageSize: 25 },
  ])
})

test("UTC formatting keeps raw cache timestamps and handles suffixless UTC values", async () => {
  assert.equal(presentation.formatLeadCreatedAt("2026-10-14T12:30:00"), new Date("2026-10-14T12:30:00Z").toLocaleString())
  assert.equal(presentation.formatLeadCreatedAt(lead.createdAt), new Date(lead.createdAt).toLocaleString())
  assert.equal(presentation.formatLeadCreatedAt("invalid"), "Unavailable")
  const { client } = mount()
  await screen.findByText(lead.profileName)
  assert.equal(client.getQueryData(queryKeys.leads.list({ botId: 73, pageNumber: 1, pageSize: 10, statusFilter: undefined })).items[0].createdAt, lead.createdAt)
})

test("unsafe URLs and server markup stay plain text", async () => {
  api.defaults.adapter = async (config) => success(config, page([{ ...lead, profileName: "<b>Profile</b>", profileUrl: "javascript:alert(1)", aiMessage: "<script>bad()</script>" }]))
  mount()
  await screen.findByText("<b>Profile</b>")
  assert.ok(screen.getByText("<script>bad()</script>"))
  assert.ok(screen.getByText("javascript:alert(1)"))
  assert.equal(within(screen.getByRole("table")).queryByRole("link"), null)
  assert.equal(document.querySelector("script"), null)
})

test("list loading, retry, and empty states do not masquerade as completed features", async () => {
  let finish
  api.defaults.adapter = (config) => new Promise((_resolve, reject) => { finish = () => reject(failure(config, "Leads unavailable", 404)) })
  mount()
  assert.ok(screen.getByRole("status", { name: "Loading table" }))
  await waitFor(() => assert.equal(typeof finish, "function"))
  await act(async () => { finish() })
  await screen.findByText("Leads unavailable")
  api.defaults.adapter = async (config) => success(config, page([], 1, 0, 0))
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await screen.findByText("No leads found")
  assert.equal(screen.getByRole("button", { name: "Next" }).disabled, true)
})

test("preview uses the server quota and preview DTO without eager account fetching", async () => {
  const calls = []
  api.defaults.adapter = async (config) => { calls.push(config.url); return defaultResponse(config) }
  mount(PreviewPage)
  await screen.findByText(previewLead.profileName)
  const quota = screen.getByLabelText("Messaging quota")
  assert.ok(quota.textContent.includes("30"))
  assert.ok(quota.textContent.includes("5"))
  assert.ok(quota.textContent.includes("25"))
  assert.ok(screen.getByText(previewLead.leadNumber))
  assert.ok(screen.getByText(previewLead.aiMessage))
  assert.equal(screen.queryByText(lead.fromGroup), null)
  assert.equal(screen.queryByLabelText("Rows per page"), null)
  assert.deepEqual(calls, ["/api/leads/bot/messaging-preview/73"])
})

test("zero allowance or an empty preview blocks Send message without account or dispatch calls", async () => {
  for (const data of [{ ...preview, allowedToProcessCount: 0 }, { ...preview, leads: [] }]) {
    const calls = []
    api.defaults.adapter = async (config) => { calls.push(config.url); return success(config, data) }
    mount(PreviewPage)
    await screen.findByText("No leads are currently available to send messages to.")
    const button = screen.getByRole("button", { name: "Send message" })
    assert.equal(button.disabled, true)
    fireEvent.click(button)
    assert.equal(screen.queryByRole("dialog"), null)
    assert.deepEqual(calls, ["/api/leads/bot/messaging-preview/73"])
    cleanup()
  }
})

test("preview loading/error blocks sending and a successful retry restores quota", async () => {
  let finish
  api.defaults.adapter = (config) => new Promise((_resolve, reject) => { finish = () => reject(failure(config, "Preview unavailable", 404)) })
  mount(PreviewPage)
  assert.equal(screen.getByRole("button", { name: "Send message" }).disabled, true)
  await waitFor(() => assert.equal(typeof finish, "function"))
  await act(async () => { finish() })
  await screen.findByText("Preview unavailable")
  assert.equal(screen.queryByLabelText("Messaging quota"), null)
  api.defaults.adapter = async (config) => defaultResponse(config)
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await screen.findByText(previewLead.profileName)
  assert.equal(screen.getByRole("button", { name: "Send message" }).disabled, false)
})

test("account modal fetches eligible path, requires selection, sends preview IDs once, and acknowledges job", async () => {
  const calls = []
  let finish, writes = 0
  api.defaults.adapter = async (config) => {
    calls.push(config.url)
    assert.equal(config.headers.has("x-worker-api-key"), false)
    if (config.method === "post") {
      writes++
      assert.deepEqual(JSON.parse(config.data), { botId: 73, accountId: 12, leadIds: [201] })
      return new Promise((resolve) => { finish = () => resolve(success(config, acknowledgment)) })
    }
    return defaultResponse(config)
  }
  mount(PreviewPage)
  await screen.findByText(previewLead.profileName)
  fireEvent.click(screen.getByRole("button", { name: "Send message" }))
  await screen.findByRole("dialog")
  await waitFor(() => assert.equal(screen.getByLabelText("Connected account").disabled, false))
  assert.equal(screen.getByLabelText("Connected account").value, "")
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }))
  await screen.findByText("Choose an eligible account.")
  assert.equal(writes, 0)
  fireEvent.change(screen.getByLabelText("Connected account"), { target: { value: "12" } })
  const form = screen.getByRole("form", { name: "Send messages" })
  fireEvent.submit(form)
  fireEvent.submit(form)
  await waitFor(() => assert.equal(writes, 1))
  assert.equal(screen.getByRole("button", { name: "Cancel" }).disabled, true)
  assert.equal(screen.getByRole("button", { name: "Close dialog" }).disabled, true)
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
  assert.ok(screen.getByRole("dialog"))
  await act(async () => { finish() })
  await screen.findByText(/Messaging job #85 accepted/)
  assert.equal(screen.queryByRole("dialog"), null)
  assert.ok(screen.getByText(/This confirms submission/))
  assert.ok(calls.filter((url) => url === "/api/v1/connectedaccounts/eligible/73").length >= 2)
  assert.ok(calls.filter((url) => url === "/api/leads/bot/messaging-preview/73").length >= 3)
  assert.equal(calls.includes("/api/v1/connectedaccounts"), false)
})

test("account loading/error/empty states keep Send disabled and offer explicit retry", async () => {
  let fail = true, writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "post") writes++
    if (config.url.includes("/eligible/")) {
      if (fail) throw failure(config, "Eligible accounts unavailable", 404)
      return success(config, [])
    }
    return defaultResponse(config)
  }
  mount(PreviewPage)
  await screen.findByText(previewLead.profileName)
  fireEvent.click(screen.getByRole("button", { name: "Send message" }))
  await screen.findByText("Eligible accounts unavailable")
  assert.equal(screen.getByRole("button", { name: "Send", exact: true }).disabled, true)
  fail = false
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retry options" }))
  await screen.findByText("No eligible connected accounts are available for this bot.")
  assert.equal(screen.getByRole("button", { name: "Send", exact: true }).disabled, true)
  assert.equal(writes, 0)
})

test("each modal opening refetches eligibility instead of accepting a cached account", async () => {
  let finish, reads = 0
  api.defaults.adapter = async (config) => {
    if (config.url.includes("/eligible/")) { reads++; return new Promise((resolve) => { finish = () => resolve(success(config, [account])) }) }
    return defaultResponse(config)
  }
  const { client } = mount(PreviewPage)
  client.setQueryData(queryKeys.accounts.list({ botId: 73, eligible: true }), [account])
  await screen.findByText(previewLead.profileName)
  fireEvent.click(screen.getByRole("button", { name: "Send message" }))
  await screen.findByRole("dialog")
  await waitFor(() => assert.equal(reads, 1))
  assert.equal(screen.getByRole("button", { name: "Send", exact: true }).disabled, true)
  await act(async () => { finish() })
  await waitFor(() => assert.equal(screen.getByLabelText("Connected account").disabled, false))
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
  fireEvent.click(screen.getByRole("button", { name: "Send message" }))
  await waitFor(() => assert.equal(reads, 2))
  assert.equal(screen.getByRole("button", { name: "Send", exact: true }).disabled, true)
  await act(async () => { finish() })
})

test("refreshing preview while opening the picker can exhaust quota and prevent dispatch", async () => {
  let previews = 0, writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "post") { writes++; return success(config, acknowledgment) }
    if (config.url.includes("messaging-preview")) { previews++; return success(config, previews === 1 ? preview : { ...preview, allowedToProcessCount: 0 }) }
    return defaultResponse(config)
  }
  mount(PreviewPage)
  await screen.findByText(previewLead.profileName)
  fireEvent.click(screen.getByRole("button", { name: "Send message" }))
  await screen.findByRole("dialog")
  await waitFor(() => assert.equal(previews, 2))
  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Send", exact: true }).disabled, true))
  fireEvent.submit(screen.getByRole("form", { name: "Send messages" }))
  assert.equal(writes, 0)
})

test("selection adapters reject quota exhaustion and non-eligible accounts without inferring eligibility", () => {
  assert.throws(() => adapt(73, 12, { ...preview, allowedToProcessCount: 0 }, [account]))
  assert.throws(() => adapt(73, 12, { ...preview, leads: [] }, [account]))
  assert.throws(() => adapt(73, 999, preview, [account]))
  assert.deepEqual(adapt(73, 12, preview, [account]), { botId: 73, accountId: 12, leadIds: [201] })
})

test("failed dispatch keeps the modal, selected account and normalized error without automatic retry", async () => {
  let writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "post") { writes++; throw failure(config, "Messaging dispatch refused", 429) }
    return defaultResponse(config)
  }
  mount(PreviewPage)
  await openPicker()
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }))
  await screen.findByText("Messaging dispatch refused")
  assert.equal(screen.getByLabelText("Connected account").value, "12")
  assert.equal(screen.getByRole("button", { name: "Send", exact: true }).disabled, false)
  assert.equal(writes, 1)
  assert.equal(screen.queryByText(/accepted/), null)
})

test("dispatch hook locks duplicates and reconciles lists, previews, and account caches on failure", async () => {
  const { client, Wrapper } = wrapper()
  const listKey = queryKeys.leads.list({ botId: 73, pageNumber: 1, pageSize: 10 })
  const previewKey = queryKeys.leads.messagingPreview(73)
  const accountKey = queryKeys.accounts.list({ botId: 73, eligible: true })
  for (const key of [listKey, previewKey, accountKey]) client.setQueryData(key, { before: true })
  client.setQueryData(queryKeys.groups.list(), ["unchanged"])
  let finish, writes = 0
  api.defaults.adapter = (config) => { writes++; return new Promise((_resolve, reject) => { finish = () => reject(failure(config, "Failure")) }) }
  const { result } = renderHook(() => useDispatch(), { wrapper: Wrapper })
  let pending
  const dto = { botId: 73, accountId: 12, leadIds: [201] }
  await act(async () => { pending = result.current.dispatch(dto); pending.catch(() => {}) })
  await assert.rejects(result.current.dispatch(dto), (error) => error.message.includes("already in progress"))
  await act(async () => { finish(); await assert.rejects(pending) })
  assert.equal(writes, 1)
  for (const key of [listKey, previewKey, accountKey]) assert.equal(client.getQueryState(key).isInvalidated, true)
  assert.deepEqual(client.getQueryData(queryKeys.groups.list()), ["unchanged"])
  await waitFor(() => assert.equal(result.current.isPending, false))
})

test("switching bots resets pagination/filter state and drops the old modal and acknowledgment", async () => {
  const calls = []
  api.defaults.adapter = async (config) => { calls.push({ url: config.url, params: config.params }); return defaultResponse(config) }
  const { rerender } = mount()
  await screen.findByText(lead.profileName)
  fireEvent.change(screen.getByLabelText("Lead status"), { target: { value: "Custom" } })
  fireEvent.click(screen.getByRole("button", { name: "Apply filter" }))
  await waitFor(() => assert.equal(calls.at(-1).params.statusFilter, "Custom"))
  rerender(h(LeadsPage, { botId: "74" }))
  await waitFor(() => assert.equal(calls.at(-1).url, "/api/leads/leads/74"))
  assert.deepEqual(calls.at(-1).params, { pageNumber: 1, pageSize: 10 })
  assert.equal(screen.getByLabelText("Lead status").value, "")
  cleanup()
  const next = mount(PreviewPage)
  await openPicker()
  next.rerender(h(PreviewPage, { botId: "74" }))
  assert.equal(screen.queryByRole("dialog"), null)
  await waitFor(() => assert.equal(calls.at(-1).url, "/api/leads/bot/messaging-preview/74"))
})

test("a late dispatch response cannot acknowledge a job in a new bot workspace", async () => {
  let finish
  api.defaults.adapter = async (config) => config.method === "post"
    ? new Promise((resolve) => { finish = () => resolve(success(config, acknowledgment)) })
    : defaultResponse(config)
  const { rerender } = mount(PreviewPage)
  await openPicker()
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }))
  await waitFor(() => assert.equal(typeof finish, "function"))
  rerender(h(PreviewPage, { botId: "74" }))
  await screen.findByText(previewLead.profileName)
  await act(async () => { finish() })
  assert.equal(screen.queryByText(/Messaging job #85 accepted/), null)
  assert.equal(screen.queryByRole("dialog"), null)
})
