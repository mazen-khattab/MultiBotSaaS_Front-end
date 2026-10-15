import { http, HttpResponse } from "msw/http"
import { expect, test, vi } from "vitest"

import { api } from "@/core/api/api"
import { SESSION_EXPIRED_MESSAGE } from "@/core/api/apiError"
import { refreshCoordinator } from "@/core/api/refreshCoordinator"
import type { AuthRealm } from "@/services/auth/auth.types"
import { adminIdentity, apiFailure, apiOrigin, apiPage, apiSuccess, botDto, userIdentity } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

// No adapter/interceptor mock: MSW sees requests after the real Axios pipeline.
test.each<AuthRealm>(["user", "admin"])("concurrent recoverable 401s share the %s realm refresh and replay once", async (realm) => {
  refreshCoordinator.setSessionRealm(realm)
  const paths = realm === "user" ? ["/api/v1/bots", "/api/v1/bots/subscribed"] : ["/api/v1/admin/users", "/api/v1/admin/bots"]
  const refreshPath = realm === "user" ? "/api/v1/auth/refresh" : "/api/v1/admin/auth/refresh"
  const gate = deferred()
  let rotated = false, refreshes = 0
  const attempts = new Map<string, number>()
  server.use(
    ...paths.map((path) => http.get(`${apiOrigin}${path}`, () => {
      attempts.set(path, (attempts.get(path) ?? 0) + 1)
      return rotated ? HttpResponse.json(apiSuccess(realm === "user" ? [botDto] : apiPage([]))) : new HttpResponse(null, { status: 401 })
    })),
    http.post(`${apiOrigin}${refreshPath}`, async () => {
      refreshes++
      await gate.promise
      rotated = true
      return HttpResponse.json(apiSuccess(realm === "user" ? userIdentity : adminIdentity))
    }),
  )
  const pending = Promise.all(paths.map((path) => api.get(path)))
  try {
    await vi.waitFor(() => { expect([...attempts.values()]).toEqual([1, 1]); expect(refreshes).toBe(1) })
  } finally { gate.resolve() }
  expect(await pending).toHaveLength(2)
  expect([...attempts.values()]).toEqual([2, 2])
  expect(refreshes).toBe(1)
})

test("failed refresh rejects every pending request without replay or another refresh loop", async () => {
  refreshCoordinator.setSessionRealm("user")
  const gate = deferred()
  let reads = 0, refreshes = 0
  const rejectRead = () => { reads++; return new HttpResponse(null, { status: 401 }) }
  server.use(
    http.get(`${apiOrigin}/api/v1/bots`, rejectRead),
    http.get(`${apiOrigin}/api/v1/bots/subscribed`, rejectRead),
    http.post(`${apiOrigin}/api/v1/auth/refresh`, async () => { refreshes++; await gate.promise; return new HttpResponse(null, { status: 401 }) }),
  )
  const pending = Promise.allSettled([api.get("/api/v1/bots"), api.get("/api/v1/bots/subscribed")])
  try { await vi.waitFor(() => { expect(reads).toBe(2); expect(refreshes).toBe(1) }) }
  finally { gate.resolve() }
  expect((await pending).every((result) => result.status === "rejected")).toBe(true)
  expect(reads).toBe(2)
  expect(refreshes).toBe(1)
  expect(refreshCoordinator.getPendingRefresh()).toBeNull()
  expect(refreshCoordinator.getExpiredError()).toMatchObject({ statusCode: 401 })
})

test("a second 401 after a successful refresh expires the session after one replay", async () => {
  let reads = 0, refreshes = 0
  server.use(
    http.get(`${apiOrigin}/api/v1/bots`, () => { reads++; return new HttpResponse(null, { status: 401 }) }),
    http.post(`${apiOrigin}/api/v1/auth/refresh`, () => { refreshes++; return HttpResponse.json(apiSuccess(userIdentity)) }),
  )
  await expect(api.get("/api/v1/bots")).rejects.toMatchObject({ statusCode: 401 })
  expect([reads, refreshes]).toEqual([2, 1])
  expect(refreshCoordinator.getExpiredError()).not.toBeNull()
})

test.each([SESSION_EXPIRED_MESSAGE, "Invalid session token."])("message-only session failure is terminal: %s", async (message) => {
  let refreshes = 0
  server.use(
    http.get(`${apiOrigin}/api/v1/bots`, () => HttpResponse.json({ message }, { status: 401 })),
    http.post(`${apiOrigin}/api/v1/auth/refresh`, () => { refreshes++; return HttpResponse.json(apiSuccess(userIdentity)) }),
  )
  await expect(api.get("/api/v1/bots")).rejects.toMatchObject({ kind: "session", statusCode: 401, message })
  expect(refreshes).toBe(0)
  expect(refreshCoordinator.getExpiredError()).toMatchObject({ kind: "session" })
})

test.each([
  { status: 400, method: "get", path: "/api/v1/bots" },
  { status: 403, method: "get", path: "/api/v1/admin/bots" },
  { status: 422, method: "post", path: "/api/v1/scrapes/42/cancel" },
])("HTTP $status is rejected without refreshing or expiring auth", async ({ status, method, path }) => {
  let refreshes = 0
  const reject = () => status === 403 ? new HttpResponse(null, { status })
    : HttpResponse.json(apiFailure(status, "Validation failed.", path, method.toUpperCase()), { status })
  server.use(
    method === "post" ? http.post(`${apiOrigin}${path}`, reject) : http.get(`${apiOrigin}${path}`, reject),
    http.post(`${apiOrigin}/api/v1/auth/refresh`, () => { refreshes++; return HttpResponse.json(apiSuccess(userIdentity)) }),
  )
  await expect(api.request({ method, url: path })).rejects.toMatchObject(status === 403 ? { kind: "unknown" } : { statusCode: status })
  expect(refreshes).toBe(0)
  expect(refreshCoordinator.getExpiredError()).toBeNull()
})

test("invalid login credentials cannot trigger refresh", async () => {
  let refreshes = 0
  server.use(
    http.post(`${apiOrigin}/api/v1/auth/login`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${apiOrigin}/api/v1/auth/refresh`, () => { refreshes++; return HttpResponse.json(apiSuccess(userIdentity)) }),
  )
  await expect(api.post("/api/v1/auth/login", { email: userIdentity.email, password: "invalid-test-password" })).rejects.toMatchObject({ statusCode: 401 })
  expect(refreshes).toBe(0)
})

test("requests carry credentials and JSON headers while stripping manual Authorization", async () => {
  let observed: Request | undefined
  server.use(http.get(`${apiOrigin}/api/v1/bots`, ({ request }) => { observed = request; return HttpResponse.json(apiSuccess([])) }))
  await api.get("/api/v1/bots", { withCredentials: false, headers: { Authorization: "Bearer disallowed" } })
  expect(observed?.credentials).toBe("include")
  expect(observed?.headers.get("Accept")).toBe("application/json")
  expect(observed?.headers.has("Authorization")).toBe(false)
  expect(observed?.headers.has("x-worker-api-key")).toBe(false)
})
