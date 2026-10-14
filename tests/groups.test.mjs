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
let originalAdapter
const originalGlobals = new Map()
const clients = []
const group = { id: 5, groupName: "Founders", groupUrl: "https://www.facebook.com/groups/founders", isActive: true }
const details = { ...group, configJson: '{"keywords":["founder"]}', relatedLeadsCount: 45, runsCount: 3 }
const input = { groupName: "New group", groupUrl: group.groupUrl, configJson: '{"minMembers":1000}', isActive: false }
const success = (config, data) => ({ config, status: 200, statusText: "OK", headers: {}, data: { isSuccess: true, message: "", errorType: 0, data } })
const failure = (config, message = "Group unavailable") => new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, undefined, {
  config, status: 400, statusText: "Error", headers: {}, data: { isSuccess: false, statusCode: 400, message, path: config.url, method: config.method, traceId: "test" },
})

// Exercise real modules in JSDOM. Only HTTP transport is replaced for these tests.
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
  ;({ GroupsService: service } = await server.ssrLoadModule("/src/features/groups/services/GroupsService.ts"))
  ;({ default: Page } = await server.ssrLoadModule("/src/features/groups/pages/GroupsPage.tsx"))
  ;({ useGroupMutations: useMutations } = await server.ssrLoadModule("/src/features/groups/hooks/useGroupMutations.ts"))
  ;({ queryKeys } = await server.ssrLoadModule("/src/core/query/queryKeys.ts"))
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  api.defaults.adapter = async (config) => config.method === "get"
    ? success(config, config.url.endsWith("/5") ? details : [group])
    : success(config, config.method === "delete" ? true : "user-id-not-group-id")
})

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
  return { client, Wrapper: ({ children }) => h(QueryClientProvider, { client }, children) }
}
function mount(botId = "73") {
  const { client, Wrapper } = wrapper()
  return { ...render(h(Page, { botId }), { wrapper: Wrapper }), client }
}
async function openCreate() {
  fireEvent.click(screen.getByRole("button", { name: "Add group" }))
  await screen.findByRole("form", { name: "Add target group" })
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: input.groupName } })
  fireEvent.change(screen.getByLabelText("Group URL"), { target: { value: input.groupUrl } })
  fireEvent.change(screen.getByLabelText("Configuration JSON"), { target: { value: input.configJson } })
}

test("CRUD uses bot-scoped read routes, existing write fields, credentials, and abort signals", async () => {
  const calls = []
  const signal = new AbortController().signal
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, method: config.method, params: config.params, body: config.data ? JSON.parse(config.data) : undefined })
    assert.equal(config.withCredentials, true)
    assert.equal(config.headers.has("Authorization"), false)
    if (config.method === "get") {
      assert.equal(config.signal, signal)
      return success(config, config.url.endsWith("/5") ? { ...details, botId: 73, groupURL: "legacy" } : [{ ...group, botId: 74 }])
    }
    return success(config, config.method === "delete" ? true : "user-id-not-group-id")
  }
  assert.deepEqual(await service.getAll(73, signal), [group])
  assert.deepEqual(await service.getById(73, 5, signal), details)
  assert.equal(await service.create({ botId: 73, ...input }), undefined)
  assert.equal(await service.update(5, { ...input, id: 999, runsCount: 4 }), undefined)
  assert.equal(await service.delete(5), undefined)
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ["get", "/api/v1/TargetGroups/73"], ["get", "/api/v1/TargetGroups/73/5"],
    ["post", "/api/v1/targetgroups"], ["put", "/api/v1/targetgroups/5"], ["delete", "/api/v1/targetgroups/5"],
  ])
  assert.equal(calls[0].params, undefined)
  assert.deepEqual(calls[2].body, { botId: 73, ...input })
  assert.deepEqual(calls[3].body, input)
})

test("malformed responses, historical casing, wrong detail IDs and false deletes fail", async () => {
  for (const data of [{ ...details, id: 6 }, { ...details, groupUrl: undefined, groupURL: group.groupUrl }, { ...details, runsCount: -1 }]) {
    api.defaults.adapter = async (config) => success(config, data)
    await assert.rejects(service.getById(73, 5))
  }
  api.defaults.adapter = async (config) => success(config, false)
  await assert.rejects(service.delete(5))
  api.defaults.adapter = async (config) => success(config, {})
  await assert.rejects(service.getAll(73))
  api.defaults.adapter = async (config) => ({ ...success(config, null), data: { isSuccess: false, message: "Rejected", errorType: 1, data: null } })
  await assert.rejects(service.create({ botId: 73, ...input }))
  await assert.rejects(service.update(5, input))
})

test("writes invalidate every group list and detail without treating UserId as GroupId", async () => {
  const { client, Wrapper } = wrapper()
  const keys = [queryKeys.groups.list({ botId: 73 }), queryKeys.groups.list({ botId: 99 }), queryKeys.groups.detail(73, 5), queryKeys.groups.detail(99, 5)]
  for (const key of keys) client.setQueryData(key, { stale: true })
  client.setQueryData(queryKeys.accounts.list(), ["untouched"])
  const { result } = renderHook(() => useMutations(), { wrapper: Wrapper })
  for (const write of [() => result.current.create({ botId: 73, ...input }), () => result.current.update(5, input)]) {
    for (const key of keys) client.setQueryData(key, { stale: true })
    await act(async () => { await write() })
    assert.ok(keys.every((key) => client.getQueryState(key).isInvalidated))
  }
  assert.deepEqual(client.getQueryData(queryKeys.accounts.list()), ["untouched"])
  assert.equal(client.getQueryData(queryKeys.groups.detail("user-id-not-group-id")), undefined)
})

test("failed writes reconcile reads and duplicate hook submissions are blocked without retry", async () => {
  const { client, Wrapper } = wrapper()
  client.setQueryData(queryKeys.groups.list(), [group])
  let finish, writes = 0
  api.defaults.adapter = (config) => { writes++; return new Promise((_resolve, reject) => { finish = () => reject(failure(config, "Write rejected")) }) }
  const { result } = renderHook(() => useMutations(), { wrapper: Wrapper })
  let pending
  await act(async () => { pending = result.current.create({ botId: 73, ...input }); pending.catch(() => {}) })
  await assert.rejects(result.current.create({ botId: 73, ...input }), (error) => error.message.includes("already in progress"))
  await act(async () => { finish(); await assert.rejects(pending) })
  assert.equal(writes, 1)
  assert.equal(client.getQueryState(queryKeys.groups.list()).isInvalidated, true)
  await waitFor(() => assert.equal(result.current.isPending, false))
})

test("list requests the current bot and only explicit detail actions fetch a group", async () => {
  const calls = []
  api.defaults.adapter = async (config) => { calls.push(config.url); return success(config, config.url.endsWith("/5") ? details : [group, { ...group, id: 6, groupName: "Second group" }]) }
  mount()
  await screen.findByText("Founders")
  assert.ok(screen.getByText("Second group"))
  assert.deepEqual(calls, ["/api/v1/TargetGroups/73"])
  assert.ok(screen.getByText("Manage the target groups assigned to this bot."))
  fireEvent.click(screen.getByRole("button", { name: "View Founders" }))
  const dialog = await screen.findByRole("dialog")
  await within(dialog).findByText("45")
  assert.ok(within(dialog).getByText(details.configJson))
  assert.ok(within(dialog).getByText("3"))
  assert.deepEqual(calls, ["/api/v1/TargetGroups/73", "/api/v1/TargetGroups/73/5"])
})

test("unsafe server URL is displayed as text without an executable link", async () => {
  api.defaults.adapter = async (config) => success(config, [{ ...group, groupUrl: "javascript:alert(1)" }])
  mount()
  await screen.findByText("Founders")
  assert.ok(screen.getByText("javascript:alert(1)"))
  assert.equal(screen.queryByRole("link"), null)
})

test("create validates fields and JSON syntax before sending any request", async () => {
  let writes = 0
  api.defaults.adapter = async (config) => { if (config.method !== "get") writes++; return success(config, []) }
  mount()
  fireEvent.click(screen.getByRole("button", { name: "Add group" }))
  fireEvent.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Enter a group name.")
  assert.equal(writes, 0)
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Valid" } })
  fireEvent.change(screen.getByLabelText("Group URL"), { target: { value: "javascript:alert(1)" } })
  fireEvent.change(screen.getByLabelText("Configuration JSON"), { target: { value: "invalid JSON" } })
  fireEvent.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Enter an HTTP or HTTPS group URL.")
  assert.ok(screen.getByText("Enter valid JSON configuration."))
  assert.equal(writes, 0)
})

test("create submits workspace context once, locks dismissal, and refreshes from server", async () => {
  let finish, writes = 0, reads = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") { reads++; return success(config, writes ? [group, { ...group, id: 9, groupName: input.groupName }] : [group]) }
    writes++
    assert.deepEqual(JSON.parse(config.data), { botId: 73, ...input, isActive: true })
    return new Promise((resolve) => { finish = () => resolve(success(config, "user-id-not-group-id")) })
  }
  const { client } = mount()
  await screen.findByText("Founders")
  await openCreate()
  const form = screen.getByRole("form", { name: "Add target group" })
  fireEvent.submit(form)
  fireEvent.submit(form)
  await waitFor(() => assert.equal(writes, 1))
  assert.equal(screen.getByRole("button", { name: "Cancel" }).disabled, true)
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
  assert.ok(screen.getByRole("dialog"))
  await act(async () => { finish() })
  await screen.findByText("Target group created.")
  assert.equal(screen.queryByRole("dialog"), null)
  assert.ok(screen.getByText(input.groupName))
  assert.ok(reads >= 2)
  assert.equal(client.getQueryData(queryKeys.groups.detail("user-id-not-group-id")), undefined)
})

test("edit waits for fresh details, preserves defaults and sends canonical fields", async () => {
  let finish, payload
  api.defaults.adapter = async (config) => {
    if (config.method === "put") { payload = JSON.parse(config.data); return success(config, "user-id-not-group-id") }
    if (config.url.endsWith("/5")) return new Promise((resolve) => { finish = () => resolve(success(config, { ...details, groupName: "Fresh name", isActive: false })) })
    return success(config, [group])
  }
  const { client } = mount()
  client.setQueryData(queryKeys.groups.detail(73, 5), { ...details, groupName: "Old name" })
  await screen.findByText("Founders")
  fireEvent.click(screen.getByRole("button", { name: "Edit Founders" }))
  await waitFor(() => assert.equal(typeof finish, "function"))
  assert.equal(screen.queryByRole("form"), null)
  await act(async () => { finish() })
  await screen.findByRole("form", { name: "Edit target group" })
  assert.equal(screen.getByLabelText("Group name").value, "Fresh name")
  assert.equal(screen.getByLabelText("Configuration JSON").value, details.configJson)
  assert.equal(screen.getByLabelText("Enabled").checked, false)
  fireEvent.change(screen.getByLabelText("Group URL"), { target: { value: "https://example.test/new" } })
  // Detail invalidation needs a resolvable response after this PUT.
  api.defaults.adapter = async (config) => {
    if (config.method === "put") { payload = JSON.parse(config.data); return success(config, "user-id-not-group-id") }
    return success(config, config.url.endsWith("/5") ? details : [group])
  }
  fireEvent.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Target group updated.")
  assert.deepEqual(payload, { groupName: "Fresh name", groupUrl: "https://example.test/new", configJson: details.configJson, isActive: false })
})

test("failed create keeps entered values and releases the form for explicit retry", async () => {
  let writes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, [group])
    writes++; throw failure(config, "Group could not be saved")
  }
  mount()
  await openCreate()
  fireEvent.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Group could not be saved")
  assert.equal(screen.getByLabelText("Group name").value, input.groupName)
  assert.equal(screen.getByLabelText("Configuration JSON").value, input.configJson)
  assert.equal(screen.getByRole("button", { name: "Save group" }).disabled, false)
  assert.equal(writes, 1)
})

test("delete requires confirmation, removes the group's details in every bot cache, and refetches lists", async () => {
  let deletes = 0
  api.defaults.adapter = async (config) => {
    if (config.method === "delete") { deletes++; return success(config, true) }
    return success(config, config.url.endsWith("/5") ? details : deletes ? [] : [group])
  }
  const { client } = mount()
  client.setQueryData(queryKeys.groups.detail(74, 5), details)
  client.setQueryData(queryKeys.groups.detail(5), details)
  client.setQueryData(queryKeys.groups.detail(74, 6), { ...details, id: 6 })
  await screen.findByText("Founders")
  fireEvent.click(screen.getByRole("button", { name: "Delete Founders" }))
  const confirm = await screen.findByRole("button", { name: "Confirm delete" })
  assert.equal(deletes, 0)
  fireEvent.click(confirm)
  await screen.findByText("Target group deleted.")
  await screen.findByText("No target groups")
  assert.equal(deletes, 1)
  assert.equal(client.getQueryData(queryKeys.groups.detail(73, 5)), undefined)
  assert.equal(client.getQueryData(queryKeys.groups.detail(74, 5)), undefined)
  assert.equal(client.getQueryData(queryKeys.groups.detail(5)), undefined)
  assert.ok(client.getQueryData(queryKeys.groups.detail(74, 6)))
})

test("failed delete retains the row and error through refetch and permits retry", async () => {
  api.defaults.adapter = async (config) => {
    if (config.method === "delete") throw failure(config, "Delete refused")
    return success(config, config.url.endsWith("/5") ? details : [group])
  }
  mount()
  await screen.findByText("Founders")
  fireEvent.click(screen.getByRole("button", { name: "Delete Founders" }))
  fireEvent.click(await screen.findByRole("button", { name: "Confirm delete" }))
  await screen.findByText("Delete refused")
  assert.equal(screen.getByRole("button", { name: "Confirm delete" }).disabled, false)
  assert.ok(screen.getByRole("button", { name: "Delete Founders", hidden: true }))
})

test("list and detail failures expose retry and do not enable edits from stale data", async () => {
  let fail = true
  api.defaults.adapter = async (config) => { if (fail) throw failure(config); return success(config, []) }
  mount()
  await screen.findByText("Group unavailable")
  fail = false
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  await screen.findByText("No target groups")
  cleanup()
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("/5")) throw failure(config, "Group not found")
    return success(config, [group])
  }
  const { client } = mount()
  client.setQueryData(queryKeys.groups.detail(73, 5), details)
  await screen.findByText("Founders")
  fireEvent.click(screen.getByRole("button", { name: "Edit Founders" }))
  await screen.findByText("Group not found")
  assert.equal(screen.queryByRole("form"), null)
  assert.ok(within(screen.getByRole("dialog")).getByRole("button", { name: "Try again" }))
})

test("switching bots closes dialogs and discards old creation context", async () => {
  let payload
  api.defaults.adapter = async (config) => {
    if (config.method === "get") return success(config, [group])
    payload = JSON.parse(config.data); return success(config, "user-id-not-group-id")
  }
  const { rerender } = mount()
  await openCreate()
  rerender(h(Page, { botId: "74" }))
  assert.equal(screen.queryByRole("dialog"), null)
  await openCreate()
  assert.ok(screen.getByText("New groups are assigned to bot 74."))
  fireEvent.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Target group created.")
  assert.equal(payload.botId, 74)
})

test("switching bots separates list and detail caches even for the same group ID", async () => {
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push(config.url)
    assert.equal(config.params, undefined)
    const botId = config.url.split("/")[4]
    return success(config, config.url.endsWith("/5")
      ? { ...details, groupName: `Bot ${botId} details` }
      : [{ ...group, groupName: `Bot ${botId} group` }])
  }
  const { client, rerender } = mount()
  await screen.findByText("Bot 73 group")
  fireEvent.click(screen.getByRole("button", { name: "View Bot 73 group" }))
  await within(screen.getByRole("dialog")).findByText("Bot 73 details")
  fireEvent.click(screen.getByRole("button", { name: "Close" }))
  rerender(h(Page, { botId: "74" }))
  await screen.findByText("Bot 74 group")
  assert.equal(screen.queryByText("Bot 73 group"), null)
  fireEvent.click(screen.getByRole("button", { name: "View Bot 74 group" }))
  await within(screen.getByRole("dialog")).findByText("Bot 74 details")
  assert.equal(client.getQueryData(queryKeys.groups.list({ botId: 73 }))[0].groupName, "Bot 73 group")
  assert.equal(client.getQueryData(queryKeys.groups.list({ botId: 74 }))[0].groupName, "Bot 74 group")
  assert.equal(client.getQueryData(queryKeys.groups.detail(73, 5)).groupName, "Bot 73 details")
  assert.equal(client.getQueryData(queryKeys.groups.detail(74, 5)).groupName, "Bot 74 details")
  assert.deepEqual(calls, ["/api/v1/TargetGroups/73", "/api/v1/TargetGroups/73/5", "/api/v1/TargetGroups/74", "/api/v1/TargetGroups/74/5"])
})
