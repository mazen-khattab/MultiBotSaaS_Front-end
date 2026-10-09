import assert from "node:assert/strict"
import { after, before, beforeEach, test } from "node:test"

import { AxiosError } from "axios"
import { createServer } from "vite"

let server
let api
let refreshSession
let refreshCoordinator
let createRefreshCoordinator
let normalizeApiError
let getRawApiError
let SESSION_EXPIRED_MESSAGE
let originalAdapter

const authResponse = {
  isSuccess: true,
  message: "Refresh token successful.",
  errorType: 0,
  data: { userId: "user-id", email: "user@example.com", name: "User", role: "User" },
}

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const response = (config, data = authResponse) => ({
  config, data, status: 200, statusText: "OK", headers: {},
})

const httpError = (config, status = 401, data = "") => new AxiosError(
  `Request failed with status code ${status}`,
  AxiosError.ERR_BAD_RESPONSE,
  config,
  undefined,
  { config, status, data, statusText: "Error", headers: {} },
)

before(async () => {
  // Load the real TypeScript modules with the application's aliases and env
  // handling. Only the HTTP adapter is replaced; no backend is contacted.
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: "custom" })
  ;({ api, refreshSession } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ refreshCoordinator, createRefreshCoordinator } = await server.ssrLoadModule("/src/core/api/refreshCoordinator.ts"))
  ;({ normalizeApiError, getRawApiError, SESSION_EXPIRED_MESSAGE } = await server.ssrLoadModule("/src/core/api/apiError.ts"))
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  api.defaults.adapter = originalAdapter
  refreshCoordinator.setSessionRealm(null)
})

after(async () => {
  if (api) api.defaults.adapter = originalAdapter
  await server?.close()
})

test("central instance sends JSON and credentials without Authorization", async () => {
  api.defaults.adapter = async (config) => {
    assert.equal(config.withCredentials, true)
    assert.equal(config.headers.get("Accept"), "application/json")
    assert.equal(config.headers.get("Content-Type"), "application/json")
    assert.equal(config.headers.has("Authorization"), false)
    assert.equal(config.auth, undefined)
    return response(config)
  }
  await api.get("/api/v1/connectedaccounts", { withCredentials: false, headers: { Authorization: "Bearer forbidden" }, auth: { username: "forbidden", password: "secret" } })
})

test("concurrent 401s share one refresh and retry each request once", async () => {
  const refreshStarted = deferred()
  const completeRefresh = deferred()
  const attempts = new Map()
  let refreshCalls = 0
  const successEvents = []
  const unsubscribe = refreshCoordinator.onRefreshSuccess((event) => { successEvents.push(event) })
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/auth/refresh") {
      refreshCalls += 1
      refreshStarted.resolve()
      await completeRefresh.promise
      return response(config)
    }
    attempts.set(config.url, (attempts.get(config.url) ?? 0) + 1)
    if (!config._authRetry) throw httpError(config)
    return response(config, { url: config.url })
  }
  try {
    const requests = Promise.all([api.get("/one"), api.get("/two"), api.get("/three")])
    await refreshStarted.promise
    completeRefresh.resolve()
    const results = await requests
    assert.equal(refreshCalls, 1)
    assert.equal(results.length, 3)
    assert.deepEqual(successEvents, [{ realm: "user", response: authResponse }])
    assert.deepEqual([...attempts.values()], [2, 2, 2])
  } finally { unsubscribe() }
})

test("a delayed 401 from before rotation does not cause another refresh", async () => {
  const delayedRequestStarted = deferred()
  const deliverDelayed401 = deferred()
  let refreshCalls = 0
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/auth/refresh") {
      refreshCalls += 1
      return response(config)
    }
    if (!config._authRetry) {
      if (config.url === "/delayed") {
        delayedRequestStarted.resolve()
        await deliverDelayed401.promise
      }
      throw httpError(config)
    }
    return response(config)
  }
  const delayed = api.get("/delayed")
  await delayedRequestStarted.promise
  await api.get("/fast")
  deliverDelayed401.resolve()
  await delayed
  assert.equal(refreshCalls, 1)
})

test("failed refresh rejects the queue and emits failure and expiry once", async () => {
  const refreshStarted = deferred()
  const failRefresh = deferred()
  let refreshCalls = 0
  let expired = 0
  let failed = 0
  const unsubscribeExpiry = refreshCoordinator.onAuthExpired(() => { expired += 1 })
  const unsubscribeFailure = refreshCoordinator.onRefreshFailed(() => { failed += 1 })
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/auth/refresh") {
      refreshCalls += 1
      refreshStarted.resolve()
      await failRefresh.promise
      throw httpError(config, 401, "Refresh token does not exist in cookies")
    }
    throw httpError(config)
  }
  try {
    const requests = Promise.allSettled([api.get("/one"), api.get("/two"), api.get("/three")])
    await refreshStarted.promise
    failRefresh.resolve()
    const results = await requests
    assert.ok(results.every((result) => result.status === "rejected" && result.reason.kind === "unauthorized"))
    assert.equal(refreshCalls, 1)
    assert.equal(expired, 1)
    assert.equal(failed, 1)
    assert.equal(results[0].reason, results[1].reason)
    await assert.rejects(api.get("/late"), { kind: "unauthorized" })
    assert.equal(refreshCalls, 1)
  } finally { unsubscribeExpiry(); unsubscribeFailure() }
})

test("single-session bare payload expires auth immediately without refresh", async () => {
  let calls = 0
  let expired = 0
  const expiryEvents = []
  const unsubscribe = refreshCoordinator.onAuthExpired((error) => { expired += 1; expiryEvents.push(error) })
  api.defaults.adapter = async (config) => {
    calls += 1
    throw httpError(config, 401, { message: SESSION_EXPIRED_MESSAGE })
  }
  try {
    await assert.rejects(api.get("/protected"), { kind: "session", statusCode: 401 })
    assert.equal(calls, 1)
    assert.equal(expired, 1)
    assert.equal(expiryEvents[0].kind, "session")
  } finally { unsubscribe() }
})

test("session expiry during refresh prevents queued retries and stale success", async () => {
  const refreshStarted = deferred()
  const completeRefresh = deferred()
  let retries = 0
  let successes = 0
  const unsubscribe = refreshCoordinator.onRefreshSuccess(() => { successes += 1 })
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/auth/refresh") {
      refreshStarted.resolve()
      await completeRefresh.promise
      return response(config)
    }
    if (config._authRetry) retries += 1
    throw httpError(config, 401, config.url === "/expired" ? { message: SESSION_EXPIRED_MESSAGE } : "")
  }
  try {
    const queued = assert.rejects(api.get("/queued"), { kind: "session" })
    await refreshStarted.promise
    await assert.rejects(api.get("/expired"), { kind: "session" })
    completeRefresh.resolve()
    await queued
    assert.equal(retries, 0)
    assert.equal(successes, 0)
  } finally { unsubscribe() }
})

test("a retried 401 expires auth after exactly one retry", async () => {
  let refreshCalls = 0
  let attempts = 0
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/auth/refresh") {
      refreshCalls += 1
      return response(config)
    }
    attempts += 1
    throw httpError(config)
  }
  await assert.rejects(api.get("/protected"), { kind: "unauthorized" })
  assert.equal(refreshCalls, 1)
  assert.equal(attempts, 2)
  assert.ok(refreshCoordinator.getExpiredError())
})

test("refresh endpoint requests never recursively refresh", async () => {
  const paths = ["/api/v1/auth/refresh", "/api/v1/admin/auth/refresh", "https://backend.example/api/v1/auth/refresh?source=bootstrap"]
  let calls = 0
  api.defaults.adapter = async (config) => { calls += 1; throw httpError(config) }
  for (const path of paths) await assert.rejects(api.post(path), { kind: "unauthorized" })
  assert.equal(calls, paths.length)
})

test("explicit refresh uses the registered admin realm and publishes success", async () => {
  refreshCoordinator.setSessionRealm("admin")
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, "/api/v1/admin/auth/refresh")
    return response(config)
  }
  assert.deepEqual(await refreshSession(), authResponse)
})

test("cold start pathname fallback and registered session realm select the right endpoint", async () => {
  for (const [pathname, expectedRealm] of [["/admin", "admin"], ["/admin/login", "admin"], ["/admin/users", "admin"], ["/administrator", "user"], ["/dashboard", "user"]]) {
    const coordinator = createRefreshCoordinator(() => pathname)
    assert.equal(coordinator.resolveRealm(), expectedRealm)
    await coordinator.refresh(async (endpoint) => {
      assert.equal(endpoint, expectedRealm === "admin" ? "/api/v1/admin/auth/refresh" : "/api/v1/auth/refresh")
      return authResponse
    })
    coordinator.setSessionRealm(expectedRealm === "admin" ? "user" : "admin")
    assert.notEqual(coordinator.resolveRealm(), expectedRealm)
    coordinator.setSessionRealm(null)
    assert.equal(coordinator.resolveRealm(), expectedRealm)
  }
})

test("coordinator returns the same Promise and cleans up for the next refresh", async () => {
  const coordinator = createRefreshCoordinator()
  const gate = deferred()
  let calls = 0
  const execute = async () => { calls += 1; await gate.promise; return authResponse }
  const first = coordinator.refresh(execute)
  assert.equal(coordinator.refresh(execute), first)
  gate.resolve()
  await first
  await coordinator.refresh(execute)
  assert.equal(calls, 2)
})

test("failure cleanup permits refresh after the auth layer registers a new session", async () => {
  const coordinator = createRefreshCoordinator()
  await assert.rejects(coordinator.refresh(async () => { throw new Error("offline") }), { kind: "unknown" })
  coordinator.setSessionRealm("user")
  assert.deepEqual(await coordinator.refresh(async () => authResponse), authResponse)
})

test("unsubscribe and throwing subscribers do not break refresh or cleanup", async () => {
  const coordinator = createRefreshCoordinator()
  let delivered = 0
  const unsubscribe = coordinator.onRefreshSuccess(() => { delivered += 1 })
  unsubscribe()
  coordinator.onRefreshSuccess(() => { throw new Error("subscriber failed") })
  coordinator.onRefreshSuccess(() => { delivered += 1 })
  await coordinator.refresh(async () => authResponse)
  await coordinator.refresh(async () => authResponse)
  assert.equal(delivered, 2)
})

test("normalization supports structured, bare, empty, network and unknown errors safely", () => {
  const payload = { isSuccess: false, statusCode: 422, message: "Validation failed.", path: "/accounts", method: "POST", traceId: "trace-id", details: "private stack", innerException: "private exception" }
  const raw = httpError({ data: "password=secret", headers: { "X-Private": "secret" } }, 422, payload)
  const normalized = normalizeApiError(raw)
  assert.deepEqual(normalized, { kind: "api", statusCode: 422, message: payload.message, path: payload.path, method: payload.method, traceId: payload.traceId })
  assert.equal(getRawApiError(normalized), raw)
  assert.equal(normalizeApiError(normalized), normalized)
  assert.ok(!JSON.stringify(normalized).includes("secret"))
  assert.ok(!JSON.stringify(normalized).includes("private stack"))
  assert.deepEqual(normalizeApiError(httpError({}, 401, "missing cookie")), { kind: "unauthorized", message: "missing cookie", statusCode: 401 })
  assert.equal(normalizeApiError(httpError({}, 401, { message: "Invalid session token." })).kind, "unauthorized")
  assert.equal(normalizeApiError(httpError({}, 401)).message, "Authentication required.")
  assert.equal(normalizeApiError(httpError({}, 500, { message: "Server failed." })).message, "Server failed.")
  assert.equal(normalizeApiError(new AxiosError("private URL", "ERR_NETWORK")).kind, "network")
  assert.equal(normalizeApiError(new Error("private error")).kind, "unknown")
  assert.equal(normalizeApiError(new Error("private error")).message, "The request could not be completed.")
})

test("non-401 failures are normalized without refreshing", async () => {
  let calls = 0
  api.defaults.adapter = async (config) => { calls += 1; throw httpError(config, 500, { message: "Server failed." }) }
  await assert.rejects(api.get("/protected"), { kind: "unknown", message: "Server failed." })
  assert.equal(calls, 1)
})

test("malformed refresh success is rejected and expires auth", async () => {
  api.defaults.adapter = async (config) => response(config, { message: "Not a success envelope." })
  await assert.rejects(refreshSession(), { kind: "unknown" })
  assert.ok(refreshCoordinator.getExpiredError())
})
