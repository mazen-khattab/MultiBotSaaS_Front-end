import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { AxiosError, CanceledError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { createServer } from "vite"

const h = React.createElement
const user = { userId: "first-user", email: "user@example.com", name: "Workspace User", role: "User" }
const payload = (statusCode, message = "Request failed.") => ({
  isSuccess: false, statusCode, message, path: "/api/v1/connectedaccounts", method: "GET", traceId: "trace-id",
  details: "private stack trace", innerException: "private inner exception",
})
const transportError = (status, data = "") => new AxiosError("private transport message", "ERR_BAD_RESPONSE", {}, undefined, {
  status, data, statusText: "Error", headers: {}, config: {},
})
const deferred = () => {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

let dom, server, render, screen, cleanup, waitFor, act, fireEvent
let createQueryClient, queryDefaults, shouldRetryQuery, queryKeys, QueryProvider, AppProviders
let AuthContext, useAuth, ApiErrorAlert, AppErrorBoundary, PageErrorState
let normalizeApiError, api, originalAdapter, refreshCoordinator, useQueryClient, useQuery, hashKey
let latestClient, latestAuth, mountedRouter
let SignalRService, testRealtimeService
const clients = new Set()
const originalGlobals = new Map()

before(async () => {
  // Only the tests install a DOM and replace HTTP transport; production uses
  // the real provider, retry policy, key factories and feedback components.
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173/login", pretendToBeVisual: true })
  const globals = {
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    Node: dom.window.Node, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
  }
  for (const [key, value] of Object.entries(globals)) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, screen, cleanup, waitFor, act, fireEvent } = await import("@testing-library/react/pure.js"))
  // Import after installing window so Query's client environment detection is
  // the same as in the browser, including observer notifications and retries.
  ;({ useQueryClient, useQuery, hashKey } = await import("@tanstack/react-query"))
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  ;({ createQueryClient } = await server.ssrLoadModule("/src/core/query/queryClient.ts"))
  ;({ queryDefaults, shouldRetryQuery } = await server.ssrLoadModule("/src/core/query/queryDefaults.ts"))
  ;({ queryKeys } = await server.ssrLoadModule("/src/core/query/queryKeys.ts"))
  ;({ QueryProvider } = await server.ssrLoadModule("/src/app/providers/QueryProvider.tsx"))
  ;({ AppProviders } = await server.ssrLoadModule("/src/app/providers/AppProviders.tsx"))
  ;({ SignalRService } = await server.ssrLoadModule("/src/services/realtime/SignalRService.ts"))
  ;({ AuthContext } = await server.ssrLoadModule("/src/context/auth/AuthContext.tsx"))
  ;({ useAuth } = await server.ssrLoadModule("/src/context/auth/useAuth.ts"))
  ;({ ApiErrorAlert } = await server.ssrLoadModule("/src/shared/components/feedback/ApiErrorAlert.tsx"))
  ;({ AppErrorBoundary } = await server.ssrLoadModule("/src/shared/components/feedback/AppErrorBoundary.tsx"))
  ;({ PageErrorState } = await server.ssrLoadModule("/src/shared/components/feedback/PageErrorState.tsx"))
  ;({ normalizeApiError } = await server.ssrLoadModule("/src/core/api/apiError.ts"))
  ;({ api } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ refreshCoordinator } = await server.ssrLoadModule("/src/core/api/refreshCoordinator.ts"))
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  window.history.replaceState(null, "", "/login")
  refreshCoordinator.setSessionRealm(null)
  latestClient = undefined
  latestAuth = undefined
  mountedRouter = undefined
  // Query tests exercise auth/cache behavior, with no live hub transport.
  testRealtimeService = new SignalRService({ hubUrl: "" })
  api.defaults.adapter = async (config) => { throw new Error(`Unexpected request to ${config.url}`) }
})

afterEach(async () => {
  cleanup()
  mountedRouter?.dispose()
  for (const client of clients) client.clear()
  clients.clear()
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  await refreshCoordinator.getPendingRefresh()?.catch(() => undefined)
})

after(async () => {
  if (api) api.defaults.adapter = originalAdapter
  await server?.close()
  dom?.window.close()
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

const testClient = () => {
  const client = createQueryClient()
  // Exercise the real retry predicate without waiting for production backoff.
  // MutationCache.clear removes entries but leaves their GC timers scheduled;
  // test-only mutations need no retention timer to keep Node's worker alive.
  client.setDefaultOptions({ ...queryDefaults,
    queries: { ...queryDefaults.queries, retryDelay: 0, gcTime: Infinity },
    mutations: { ...queryDefaults.mutations, gcTime: Infinity },
  })
  clients.add(client)
  return client
}

const authValue = (identity = user, realm = "user") => ({
  user: identity, realm: identity ? realm : null, status: identity ? "authenticated" : "anonymous",
  loginUser: async () => user, loginAdmin: async () => user, logout: async () => {}, refresh: async () => identity,
})

function CacheProbe() {
  const client = useQueryClient()
  React.useEffect(() => { latestClient = client; clients.add(client) }, [client])
  return h("output", { "data-testid": "cached-accounts" }, JSON.stringify(client.getQueryData(queryKeys.accounts.list()) ?? "empty"))
}

const providerTree = (value, child = h(CacheProbe)) => h(AuthContext.Provider, { value }, h(QueryProvider, null, child))

test("query policy retries only bounded network and HTTP 5xx failures", () => {
  const eligible = [
    new AxiosError("Offline", "ERR_NETWORK"), new AxiosError("Timed out", "ECONNABORTED"),
    { kind: "network", message: "Offline" }, transportError(500), transportError(503, { message: "Unavailable" }),
    normalizeApiError(transportError(502)), normalizeApiError(transportError(504, payload(504))), payload(500),
  ]
  for (const error of eligible) {
    assert.equal(shouldRetryQuery(0, error), true)
    assert.equal(shouldRetryQuery(1, error), true)
    assert.equal(shouldRetryQuery(2, error), false)
  }
  for (const status of [400, 401, 403, 404, 409, 422, 429]) {
    assert.equal(shouldRetryQuery(0, transportError(status, payload(status))), false)
    assert.equal(shouldRetryQuery(0, normalizeApiError(transportError(status, payload(status)))), false)
  }
  for (const error of [new Error("Unknown failure"), null, undefined, new CanceledError("Cancelled", {}, {}),
    normalizeApiError(new CanceledError("Cancelled", {}, {})), { kind: "session", statusCode: 401, message: "Expired" }]) {
    assert.equal(shouldRetryQuery(0, error), false)
  }
})

test("actual QueryClient limits repeated network/5xx failures to three total attempts", async () => {
  for (const error of [new AxiosError("Offline", "ERR_NETWORK"), normalizeApiError(transportError(503))]) {
    const client = testClient()
    let attempts = 0
    await assert.rejects(client.fetchQuery({ queryKey: queryKeys.accounts.list(), queryFn: async () => { attempts += 1; throw error } }))
    assert.equal(attempts, 3)
  }
})

test("QueryClient never retries business failures or unknown exceptions", async () => {
  for (const error of [normalizeApiError(transportError(401)), normalizeApiError(transportError(422, payload(422))),
    normalizeApiError(transportError(429, payload(429))), new Error("Unexpected exception")]) {
    let attempts = 0
    await assert.rejects(testClient().fetchQuery({ queryKey: queryKeys.groups.list(), queryFn: async () => { attempts += 1; throw error } }))
    assert.equal(attempts, 1)
  }
})

test("a terminal Axios refresh failure is not repeated by Query", async () => {
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    throw new AxiosError("Unauthorized", "ERR_BAD_RESPONSE", config, undefined, {
      config, status: 401, statusText: "Unauthorized", headers: {}, data: config.url.endsWith("/refresh") ? "Missing refresh cookie" : "",
    })
  }
  await assert.rejects(testClient().fetchQuery({ queryKey: queryKeys.accounts.list(), queryFn: async () => (await api.get("/api/v1/connectedaccounts")).data }), { kind: "unauthorized" })
  assert.deepEqual(paths, ["/api/v1/connectedaccounts", "/api/v1/auth/refresh"])
})

test("mutations do not automatically repeat writes even after network failure", async () => {
  const client = testClient()
  let writes = 0
  const mutation = client.getMutationCache().build(client, {
    mutationFn: async () => { writes += 1; throw new AxiosError("Offline", "ERR_NETWORK") },
  })
  await assert.rejects(mutation.execute(undefined))
  assert.equal(writes, 1)
})

test("query keys separate domains, result shapes, filters and identifiers", () => {
  const roots = new Set()
  for (const [domain, keys] of Object.entries(queryKeys)) {
    roots.add(hashKey(keys.all))
    assert.deepEqual(keys.all, [domain])
    assert.deepEqual(keys.lists(), [domain, "list"])
    assert.deepEqual(keys.details(), [domain, "detail"])
    assert.notEqual(hashKey(keys.list()), hashKey(keys.detail("id")))
  }
  assert.equal(roots.size, 6)
  assert.equal(hashKey(queryKeys.leads.list({ botId: "bot-a", page: 1 })), hashKey(queryKeys.leads.list({ page: 1, botId: "bot-a" })))
  assert.notEqual(hashKey(queryKeys.leads.list({ botId: "bot-a", page: 1 })), hashKey(queryKeys.leads.list({ botId: "bot-a", page: 2 })))
  assert.notEqual(hashKey(queryKeys.accounts.detail(1)), hashKey(queryKeys.accounts.detail("1")))
})

test("list prefixes invalidate matching lists without touching details or other domains", async () => {
  const client = testClient()
  const firstList = queryKeys.accounts.list({ status: "Active" })
  const secondList = queryKeys.accounts.list({ status: "CoolingDown" })
  const detail = queryKeys.accounts.detail("account-id")
  const groups = queryKeys.groups.list()
  for (const key of [firstList, secondList, detail, groups]) client.setQueryData(key, [])
  await client.invalidateQueries({ queryKey: queryKeys.accounts.lists() })
  assert.equal(client.getQueryState(firstList).isInvalidated, true)
  assert.equal(client.getQueryState(secondList).isInvalidated, true)
  assert.equal(client.getQueryState(detail).isInvalidated, false)
  assert.equal(client.getQueryState(groups).isInvalidated, false)
})

test("same-principal identity hydration keeps the client and its cached data", () => {
  const { rerender } = render(providerTree(authValue()))
  const first = latestClient
  first.setQueryData(queryKeys.accounts.list(), ["cached account"])
  rerender(providerTree(authValue({ ...user, name: "Updated Name", email: "updated@example.com" })))
  assert.equal(latestClient, first)
  assert.ok(screen.getByTestId("cached-accounts").textContent.includes("cached account"))
})

test("user, realm and role changes replace the cache before the next principal renders", async () => {
  const { rerender } = render(providerTree(authValue()))
  for (const [identity, realm] of [[{ ...user, userId: "second-user" }, "user"], [{ ...user, role: "Admin" }, "admin"], [{ ...user, role: "SuperAdmin" }, "admin"]]) {
    const old = latestClient
    old.setQueryData(queryKeys.accounts.list(), ["previous private data"])
    rerender(providerTree(authValue(identity, realm)))
    assert.notEqual(latestClient, old)
    assert.equal(screen.getByTestId("cached-accounts").textContent, '"empty"')
    await act(async () => { await Promise.resolve() })
    assert.equal(old.getQueryCache().getAll().length, 0)
  }
})

test("logout replaces and disposes both query and mutation caches", async () => {
  const { rerender } = render(providerTree(authValue()))
  const old = latestClient
  old.setQueryData(queryKeys.accounts.list(), ["private account"])
  await old.getMutationCache().build(old, { mutationFn: async () => true, gcTime: Infinity }).execute(undefined)
  rerender(providerTree(authValue(null)))
  assert.notEqual(latestClient, old)
  assert.equal(screen.getByTestId("cached-accounts").textContent, '"empty"')
  await act(async () => { await Promise.resolve() })
  assert.equal(old.getQueryCache().getAll().length, 0)
  assert.equal(old.getMutationCache().getAll().length, 0)
})

test("a disposed session aborts an active query and late results cannot enter the new cache", async () => {
  const gate = deferred()
  let aborted = false
  const { rerender } = render(providerTree(authValue()))
  const old = latestClient
  const pending = old.fetchQuery({ queryKey: queryKeys.accounts.list(), gcTime: Infinity, queryFn: ({ signal }) => {
    signal.addEventListener("abort", () => { aborted = true })
    return gate.promise
  } }).catch(() => undefined)
  rerender(providerTree(authValue(null)))
  await waitFor(() => assert.equal(aborted, true))
  gate.resolve(["late private result"])
  await pending
  assert.equal(latestClient.getQueryData(queryKeys.accounts.list()), undefined)
  assert.equal(old.getQueryData(queryKeys.accounts.list()), undefined)
})

test("StrictMode replay retains the active client's cache instead of clearing it", async () => {
  const gate = deferred()
  let attempts = 0
  function QueryProbe() {
    const client = useQueryClient()
    const query = useQuery({ queryKey: queryKeys.accounts.list(), gcTime: Infinity, queryFn: () => { attempts += 1; return gate.promise } })
    React.useEffect(() => { latestClient = client; clients.add(client) }, [client])
    return h("output", null, query.data ?? query.status)
  }
  render(h(React.StrictMode, null, providerTree(authValue(), h(QueryProbe))))
  await act(async () => { gate.resolve("cached result"); await gate.promise })
  await screen.findByText("cached result")
  assert.equal(attempts, 1)
  assert.equal(latestClient.getQueryData(queryKeys.accounts.list()), "cached result")
})

test("AppProviders installs Query without putting server data into Auth Context", async () => {
  function AppProbe() {
    const auth = useAuth()
    const client = useQueryClient()
    React.useEffect(() => { latestAuth = auth; latestClient = client; clients.add(client) }, [auth, client])
    return h("p", null, "Providers ready")
  }
  api.defaults.adapter = async (config) => ({ config, status: 200, statusText: "OK", headers: {}, data: {
    isSuccess: true, message: "Login successful.", errorType: 0, data: user,
  } })
  render(h(AppProviders, { realtimeService: testRealtimeService }, h(AppProbe)))
  const anonymousClient = latestClient
  await act(async () => { await latestAuth.loginUser({ email: user.email, password: "test-only password" }) })
  assert.notEqual(latestClient, anonymousClient)
  latestClient.setQueryData(queryKeys.accounts.list(), ["server-only account"])
  assert.deepEqual(latestAuth.user, user)
  assert.equal("accounts" in latestAuth, false)
  assert.equal("queryClient" in latestAuth, false)
  assert.ok(screen.getByText("Providers ready"))
})

test("API alerts render only normalized messages for structured, bare, network and unknown failures", () => {
  for (const [error, expected] of [[payload(422, "Validation failed."), "Validation failed."],
    [normalizeApiError(transportError(500, payload(500, "Service unavailable."))), "Service unavailable."],
    [{ message: "Invalid session token." }, "Invalid session token."],
    [new AxiosError("private URL", "ERR_NETWORK"), "Unable to reach the server. Please try again."],
    [new Error("private JavaScript stack"), "The request could not be completed."]]) {
    render(h(ApiErrorAlert, { error }))
    assert.ok(screen.getByRole("alert").textContent.includes(expected))
    assert.equal(document.body.textContent.includes("private"), false)
    cleanup()
  }
})

test("API alerts have no global loading UI and retry only through an explicit callback", () => {
  const { rerender } = render(h(ApiErrorAlert, { error: null }))
  assert.equal(screen.queryByRole("alert"), null)
  assert.equal(screen.queryByRole("status"), null)
  let retries = 0
  rerender(h(ApiErrorAlert, { error: payload(503), onRetry: () => { retries += 1 } }))
  assert.equal(retries, 0)
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  assert.equal(retries, 1)
  rerender(h(ApiErrorAlert, { error: payload(503), onRetry: () => { retries += 1 }, retrying: true }))
  const pendingButton = screen.getByRole("button", { name: "Retrying…" })
  assert.equal(pendingButton.disabled, true)
  fireEvent.click(pendingButton)
  assert.equal(retries, 1)
})

test("application boundary shows a generic fallback and recovers without router/provider dependencies", () => {
  let broken = true
  function CrashingChild() {
    if (broken) throw new Error("private crash details and stack")
    return h("p", null, "Recovered content")
  }
  const originalError = console.error
  // React reports intentional boundary failures to the console in development.
  console.error = () => {}
  try {
    render(h(AppErrorBoundary, null, h(CrashingChild)))
    assert.ok(screen.getByRole("alert"))
    assert.equal(document.body.textContent.includes("private"), false)
    broken = false
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    assert.ok(screen.getByText("Recovered content"))
  } finally { console.error = originalError }
})

test("AppProviders wraps provider children with the application error boundary", () => {
  function CrashingChild() { throw new Error("private crash") }
  const originalError = console.error
  console.error = () => {}
  try {
    render(h(AppProviders, { realtimeService: testRealtimeService }, h(CrashingChild)))
    assert.ok(screen.getByRole("heading", { name: "Something went wrong" }))
    assert.equal(document.body.textContent.includes("private"), false)
  } finally { console.error = originalError }
})

test("route fallback uses the API alert without exposing development debug fields", async () => {
  mountedRouter = createMemoryRouter([{ path: "/failure", loader: () => { throw payload(500, "Route request failed.") },
    element: h("p", null, "Unavailable page"), errorElement: h(PageErrorState), hydrateFallbackElement: h("p", null, "Loading route") }], { initialEntries: ["/failure"] })
  render(h(RouterProvider, { router: mountedRouter }))
  await screen.findByText("Route request failed.")
  assert.equal(document.body.textContent.includes("private stack"), false)
  assert.equal(document.body.textContent.includes("private inner"), false)
})

test("route fallback preserves the existing not-found message", async () => {
  mountedRouter = createMemoryRouter([{ path: "/missing", loader: () => { throw new Response(null, { status: 404 }) },
    element: h("p", null, "Unavailable page"), errorElement: h(PageErrorState), hydrateFallbackElement: h("p", null, "Loading route") }], { initialEntries: ["/missing"] })
  render(h(RouterProvider, { router: mountedRouter }))
  await screen.findByText("The requested page could not be found.")
})
