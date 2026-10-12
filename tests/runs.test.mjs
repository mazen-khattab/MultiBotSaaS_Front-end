import assert from "node:assert/strict"
import { after, afterEach, before, test } from "node:test"
import { fileURLToPath } from "node:url"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import ts from "typescript"
import { createServer } from "vite"
import { z } from "zod"

const h = React.createElement
let server, dom, api, RunsService, createRunAdapter, GenericRunsPage
let render, screen, cleanup, fireEvent, waitFor, act, originalAdapter
const originalGlobals = new Map()
const clients = []

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
  ;({ render, screen, cleanup, fireEvent, waitFor, act } = await import("@testing-library/react/pure.js"))
  server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  ;({ api } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ RunsService } = await server.ssrLoadModule("/src/features/runs/services/RunsService.ts"))
  ;({ createRunAdapter } = await server.ssrLoadModule("/src/features/runs/adapters/createRunAdapter.ts"))
  ;({ default: GenericRunsPage } = await server.ssrLoadModule("/src/features/runs/pages/GenericRunsPage.tsx"))
  originalAdapter = api.defaults.adapter
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

const success = (config, data = 42) => ({
  config, status: 200, statusText: "OK", headers: {},
  data: { isSuccess: true, message: "Run started successfully.", errorType: 0, data },
})
const failure = (config, status, message) => new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, undefined, {
  config, status, statusText: "Error", headers: {},
  data: { isSuccess: false, statusCode: status, message, path: "/api/v1/runs", method: "POST", traceId: "test-trace" },
})
const capabilities = { canCreateRun: true, canListRuns: false, canGetRun: false, canCancelRun: false, canRetryRun: false }
// All bot schemas, selection records, and HTTP responses are test-only fixtures.
const config = {
  title: "Test runs", table: { caption: "Run history", columns: [{ key: "id", header: "ID", accessorKey: "id" }] }, capabilities,
  startRun: {
    description: "Configure this test run.",
    form: {
      schema: z.object({ account: z.string().min(1), term: z.string().trim().min(1, "Enter a term.") }),
      fields: [
        { name: "account", label: "Account", type: "select", optionsProvider: "accounts" },
        { name: "term", label: "Search term", type: "text", required: true },
      ],
      defaultValues: { account: "5", term: "Initial term" },
    },
    resolveSelection: (values) => ({ connectedAccountId: Number(values.account), accountStatus: "Active" }),
    serializeInfoJson: (values) => JSON.stringify({ testSearch: values.term }),
  },
}
const options = { accounts: { items: [{ value: "5", label: "Test account" }] } }
function mount(props = {}) {
  // Retry enabled globally proves this write still opts out explicitly.
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 3, retryDelay: 0 } } })
  clients.push(client)
  const page = (overrides = {}) => h(QueryClientProvider, { client }, h(GenericRunsPage, { botId: "1", config, options, ...props, ...overrides }))
  const view = render(page())
  return { ...view, update: (overrides) => view.rerender(page(overrides)) }
}
async function openModal() {
  fireEvent.click(screen.getByRole("button", { name: "Start run" }))
  return screen.findByRole("dialog", { name: "Start run" })
}
function submit() { fireEvent.submit(screen.getByRole("form", { name: "Start run" })) }

test("create-only service sends the exact documented DTO with cookie credentials and returns an ID", async () => {
  const dto = { botId: 1, connectedAccountId: 5, targetGroupId: null, infoJson: '{"module":"test"}' }
  let calls = 0
  api.defaults.adapter = async (request) => {
    calls += 1
    assert.equal(request.url, "/api/v1/runs")
    assert.equal(request.method, "post")
    assert.equal(request.withCredentials, true)
    assert.equal(request.headers.has("Authorization"), false)
    assert.deepEqual(JSON.parse(request.data), dto)
    return success(request)
  }
  assert.equal(await RunsService.createRun(dto), 42)
  assert.equal(calls, 1)
  assert.deepEqual(Object.keys(RunsService), ["createRun"])
})

test("invalid envelopes and non-integer/null run IDs never report success", async () => {
  for (const data of [null, "42", 0, -1, 1.5, 2_147_483_648]) {
    api.defaults.adapter = async (request) => success(request, data)
    await assert.rejects(RunsService.createRun({ botId: 1, connectedAccountId: 5, infoJson: "{}" }), (error) => /valid run ID/.test(error.message))
  }
  api.defaults.adapter = async (request) => ({ ...success(request), data: { data: 42 } })
  await assert.rejects(RunsService.createRun({ botId: 1, connectedAccountId: 5, infoJson: "{}" }))
})

test("feature selection and serializer receive parsed values and route context without metadata rewriting", async () => {
  const calls = []
  const values = { account: "5", term: "test" }
  const dto = await createRunAdapter("12", values, {
    ...config.startRun,
    resolveSelection: async (...args) => { calls.push(args); return { connectedAccountId: 5, accountStatus: "Active", targetGroupId: 3 } },
    serializeInfoJson: (...args) => { calls.push(args); return ' { "differentSchema": [1, 2] } ' },
  })
  assert.deepEqual(dto, { botId: 12, connectedAccountId: 5, targetGroupId: 3, infoJson: ' { "differentSchema": [1, 2] } ' })
  assert.deepEqual(calls, [[values, { botId: 12 }], [values, { botId: 12 }]])
  const empty = await createRunAdapter("1", values, { ...config.startRun, serializeInfoJson: undefined })
  assert.equal(empty.infoJson, "{}")
  assert.equal(Object.hasOwn(empty, "targetGroupId"), false)
})

test("unknown/inactive status and invalid IDs block DTO conversion without guessing account readiness", async () => {
  for (const accountStatus of [null, "Busy", "CoolingDown", "Banned", "Active "]) {
    await assert.rejects(createRunAdapter("1", {}, {
      ...config.startRun, resolveSelection: () => ({ connectedAccountId: 5, accountStatus }),
    }), (error) => /account/i.test(error.message))
  }
  for (const id of ["", "abc", "1e2", "1.5", "-1", "0", "2147483648"]) {
    await assert.rejects(createRunAdapter(id, {}, config.startRun), (error) => /bot ID/.test(error.message))
  }
  await assert.rejects(createRunAdapter("1", {}, {
    ...config.startRun, resolveSelection: () => ({ connectedAccountId: 5, accountStatus: "Active", targetGroupId: -3 }),
  }), (error) => /target group/.test(error.message))
})

test("the page shows unavailable history without sending any list/detail request", async () => {
  let requests = 0
  api.defaults.adapter = async () => { requests += 1; throw new Error("Unexpected request") }
  mount()
  assert.match(screen.getByText(/Run history is currently unavailable/).textContent, /details cannot be loaded/)
  assert.equal(screen.queryByRole("table"), null)
  assert.equal(screen.queryByRole("button", { name: /cancel|retry/i }), null)
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)) })
  assert.equal(requests, 0)
})

test("capability, absent form, and feature readiness each disable creation with an explanation", () => {
  const view = mount({ config: { ...config, capabilities: { ...capabilities, canCreateRun: false }, startUnavailableReason: "Module cannot start runs." } })
  assert.equal(screen.getByRole("button", { name: "Start run" }).disabled, true)
  assert.ok(screen.getByText("Module cannot start runs."))
  view.update({ config: { ...config, startRun: undefined } })
  assert.equal(screen.getByRole("button", { name: "Start run" }).disabled, true)
  view.update({ config, startDisabledReason: "Account status is unavailable." })
  assert.equal(screen.getByRole("button", { name: "Start run" }).disabled, true)
  assert.ok(screen.getByText("Account status is unavailable."))
})

test("starting a run validates and serializes the form, closes the modal, and shows only acknowledgment", async () => {
  const requests = []
  api.defaults.adapter = async (request) => { requests.push(request); return success(request) }
  mount()
  await openModal()
  fireEvent.change(screen.getByRole("textbox", { name: "Search term" }), { target: { value: "  Parsed term  " } })
  submit()
  await waitFor(() => assert.ok(screen.getByRole("status")))
  assert.equal(screen.queryByRole("dialog"), null)
  assert.match(screen.getByRole("status").textContent, /Run #42 started successfully/)
  assert.deepEqual(JSON.parse(requests[0].data), { botId: 1, connectedAccountId: 5, infoJson: '{"testSearch":"Parsed term"}' })
  assert.equal(requests.length, 1)
  assert.equal(screen.queryByRole("table"), null)
  await openModal()
  assert.equal(screen.getByRole("textbox", { name: "Search term" }).value, "Initial term")
})

for (const [status, message, guidance] of [
  [429, "Bot is on cooldown. Next run available in 12 minutes.", /Wait for the current run or cooldown/],
  [429, "The previous run is still in progress.", /Wait for the current run or cooldown/],
  [422, "Account is currently Busy and cannot be used.", /choose an Active connected account/],
  [400, "Validation failed.", /Review your inputs/],
  [404, "Bot not owned.", /Check your access/],
]) {
  test(`${status}: ${message} retains input and gives guidance without automatic retries`, async () => {
    let calls = 0
    api.defaults.adapter = async (request) => { calls += 1; throw failure(request, status, message) }
    mount()
    await openModal()
    fireEvent.change(screen.getByRole("textbox", { name: "Search term" }), { target: { value: "Retained" } })
    submit()
    const alert = await screen.findByRole("alert")
    assert.ok(alert.textContent.includes(message))
    assert.match(alert.textContent, guidance)
    assert.equal(screen.getByRole("textbox", { name: "Search term" }).value, "Retained")
    assert.ok(screen.getByRole("dialog"))
    assert.equal(screen.queryByRole("status"), null)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
    assert.equal(calls, 1)
    api.defaults.adapter = async (request) => { calls += 1; return success(request) }
    submit()
    await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true))
    assert.equal(calls, 2)
  })
}

test("rapid submissions cannot duplicate a write and pending requests block dismissal", async () => {
  let finish, calls = 0
  const pending = new Promise((resolve) => { finish = resolve })
  api.defaults.adapter = async (request) => { calls += 1; await pending; return success(request) }
  mount()
  await openModal()
  submit()
  submit()
  await waitFor(() => assert.equal(calls, 1))
  assert.equal(screen.getByRole("button", { name: "Cancel" }).disabled, true)
  assert.equal(screen.getByRole("button", { name: "Close dialog" }).disabled, true)
  fireEvent.keyDown(document.activeElement, { key: "Escape" })
  assert.ok(screen.getByRole("dialog"))
  await act(async () => { finish(); await pending })
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true))
  assert.equal(calls, 1)
})

test("a late creation response cannot acknowledge a run in another bot workspace", async () => {
  let finish, calls = 0
  const pending = new Promise((resolve) => { finish = resolve })
  api.defaults.adapter = async (request) => { calls += 1; await pending; return success(request) }
  const view = mount()
  await openModal()
  submit()
  await waitFor(() => assert.equal(calls, 1))
  view.update({ botId: "2" })
  await act(async () => { finish(); await pending })
  assert.equal(screen.queryByRole("status"), null)
  assert.equal(screen.queryByRole("dialog"), null)
})

test("feature options and unknown account status block creation without calling the run API", async () => {
  let calls = 0
  api.defaults.adapter = async (request) => { calls += 1; return success(request) }
  const view = mount({ options: { accounts: { items: [], isLoading: true } } })
  await openModal()
  assert.equal(screen.getByRole("button", { name: "Start run" }).disabled, true)
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
  view.update({ options, config: { ...config, startRun: { ...config.startRun,
    resolveSelection: () => ({ connectedAccountId: 5, accountStatus: null }),
  } } })
  await openModal()
  submit()
  assert.match((await screen.findByRole("alert")).textContent, /status cannot be verified/)
  assert.equal(calls, 0)
})

test("typed registry wrappers preserve form transforms and reject unsupported history/metadata contracts", () => {
  const project = fileURLToPath(new URL("../tsconfig.app.json", import.meta.url))
  const loaded = ts.readConfigFile(project, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, fileURLToPath(new URL("../", import.meta.url)))
  const program = ts.createProgram([
    fileURLToPath(new URL("./runs.types.fixture.ts", import.meta.url)),
    fileURLToPath(new URL("../src/vite-env.d.ts", import.meta.url)),
  ], { ...parsed.options, tsBuildInfoFile: undefined })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => "\n",
  }))
})
