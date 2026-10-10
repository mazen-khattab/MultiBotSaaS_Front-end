import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"

import { AxiosError } from "axios"
import { JSDOM } from "jsdom"
import React from "react"
import { createMemoryRouter, matchRoutes, RouterProvider } from "react-router-dom"
import { createServer } from "vite"

const h = React.createElement
const user = { userId: "user-id", email: "user@example.com", name: "Workspace User", role: "User" }
const admin = { userId: "admin-id", email: "admin@example.com", name: "Platform Admin", role: "Admin" }
const credentials = { email: user.email, password: "correct password" }
const envelope = (data, message = "Success.") => ({ isSuccess: true, errorType: 0, message, data })
const response = (config, data) => ({ config, data, status: 200, statusText: "OK", headers: {} })
const failure = (config, status = 401, data = "") => new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, {
  config, data, status, statusText: "Error", headers: {},
})
const deferred = () => {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

let server, dom, api, originalAdapter, refreshCoordinator, createRefreshCoordinator, AuthService
let AuthProvider, AuthContext, useAuth, RequireAuth, RequireRole, RootRedirectPage, LoginForm
let DashboardHeader, SidebarProvider, appRoutes, browserRouter, navigation
let render, screen, cleanup, waitFor, act, userEvent
let latestAuth
let mountedRouter
const originalGlobals = new Map()

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173/login", pretendToBeVisual: true })
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Element: dom.window.Element,
    SVGElement: dom.window.SVGElement, ShadowRoot: dom.window.ShadowRoot, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
    Event: dom.window.Event, CustomEvent: dom.window.CustomEvent, MouseEvent: dom.window.MouseEvent, MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true }
  for (const [key, value] of Object.entries(globals)) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  ;({ render, screen, cleanup, waitFor, act } = await import("@testing-library/react/pure.js"))
  ;({ default: userEvent } = await import("@testing-library/user-event"))
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  ;({ api } = await server.ssrLoadModule("/src/core/api/api.ts"))
  ;({ refreshCoordinator, createRefreshCoordinator } = await server.ssrLoadModule("/src/core/api/refreshCoordinator.ts"))
  ;({ AuthService } = await server.ssrLoadModule("/src/services/auth/AuthService.ts"))
  ;({ AuthProvider } = await server.ssrLoadModule("/src/context/auth/AuthProvider.tsx"))
  ;({ AuthContext } = await server.ssrLoadModule("/src/context/auth/AuthContext.tsx"))
  ;({ useAuth } = await server.ssrLoadModule("/src/context/auth/useAuth.ts"))
  ;({ RequireAuth } = await server.ssrLoadModule("/src/app/router/RequireAuth.tsx"))
  ;({ RequireRole } = await server.ssrLoadModule("/src/app/router/RequireRole.tsx"))
  ;({ default: RootRedirectPage } = await server.ssrLoadModule("/src/app/router/RootRedirectPage.tsx"))
  ;({ LoginForm } = await server.ssrLoadModule("/src/features/auth/components/LoginForm.tsx"))
  ;({ DashboardHeader } = await server.ssrLoadModule("/src/shared/components/layout/DashboardHeader.tsx"))
  ;({ SidebarProvider } = await server.ssrLoadModule("/src/shared/ui/sidebar.tsx"))
  ;({ appRoutes, router: browserRouter } = await server.ssrLoadModule("/src/app/router/router.tsx"))
  navigation = await server.ssrLoadModule("/src/app/router/authNavigation.ts")
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  window.history.replaceState(null, "", "/login")
  refreshCoordinator.setSessionRealm(null)
  latestAuth = undefined
  mountedRouter = undefined
  api.defaults.adapter = async (config) => { throw new Error(`Unexpected request to ${config.url}`) }
})

afterEach(async () => {
  cleanup()
  // Radix schedules focus restoration after unmount. Drain that work while the
  // DOM's Event/CustomEvent globals are still installed.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  mountedRouter?.dispose()
  await refreshCoordinator.getPendingRefresh()?.catch(() => undefined)
  assert.equal(window.localStorage.length, 0)
  assert.equal(window.sessionStorage.length, 0)
})

after(async () => {
  if (api) api.defaults.adapter = originalAdapter
  browserRouter?.dispose()
  await server?.close()
  dom?.window.close()
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

function Probe() {
  const auth = useAuth()
  React.useEffect(() => { latestAuth = auth }, [auth])
  return h("output", { "data-testid": "auth" }, JSON.stringify({ user: auth.user, realm: auth.realm, status: auth.status }))
}

const mountProvider = (pathname = "/login", strict = false, child = h(Probe)) => {
  window.history.replaceState(null, "", pathname)
  const tree = h(AuthProvider, null, child)
  return render(strict ? h(React.StrictMode, null, tree) : tree)
}

const fakeAuth = (status = "authenticated", realm = "user", identity = user) => ({
  user: status === "authenticated" ? identity : null,
  realm: status === "authenticated" ? realm : null,
  status,
  loginUser: async () => user, loginAdmin: async () => admin, logout: async () => {}, refresh: async () => identity,
})

const mountRouter = (routes, pathname, value) => {
  mountedRouter = createMemoryRouter(routes, { initialEntries: [pathname] })
  return render(h(AuthContext.Provider, { value }, h(RouterProvider, { router: mountedRouter })))
}

const guardedRoutes = (realm = "user") => [{
  element: h(RequireAuth, { realm }), children: [{
    element: h(RequireRole, { roles: realm === "user" ? ["User"] : ["Admin", "SuperAdmin"] }),
    children: [{ path: realm === "user" ? "/dashboard/*" : "/admin/*", element: h("p", null, "Protected content") }],
  }],
}, { path: "/login", element: h("p", null, "User login destination") },
{ path: "/admin/login", element: h("p", null, "Admin login destination") }]

test("all six auth service methods use their documented endpoints and the central API", async () => {
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    assert.equal(config.withCredentials, true)
    assert.equal(config.headers.has("Authorization"), false)
    if (config.url.endsWith("/login")) assert.deepEqual(JSON.parse(config.data), credentials)
    else assert.equal(config.data, undefined)
    return response(config, envelope(config.url.endsWith("/logout") ? true : config.url.includes("/admin/") ? admin : user))
  }
  assert.deepEqual(await AuthService.loginUser(credentials), user)
  assert.deepEqual(await AuthService.refreshUser(), user)
  await AuthService.logoutUser()
  assert.deepEqual(await AuthService.loginAdmin(credentials), admin)
  // Explicit admin refresh stays admin even when the fallback pathname is /login.
  assert.deepEqual(await AuthService.refreshAdmin(), admin)
  await AuthService.logoutAdmin()
  assert.deepEqual(paths, ["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/admin/auth/login", "/api/v1/admin/auth/refresh", "/api/v1/admin/auth/logout"])
})

test("invalid user/admin credentials show a normalized error without refresh", async () => {
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    throw failure(config, 401, { isSuccess: false, statusCode: 401, message: "Invalid credentials.", path: config.url, method: "POST", traceId: "trace", details: "private stack" })
  }
  await assert.rejects(AuthService.loginUser(credentials), { kind: "api", message: "Invalid credentials." })
  await assert.rejects(AuthService.loginAdmin(credentials), { kind: "api", message: "Invalid credentials." })
  assert.deepEqual(paths, ["/api/v1/auth/login", "/api/v1/admin/auth/login"])
  assert.equal(refreshCoordinator.getExpiredError(), null)
})

test("auth service validates identity and returns only documented identity fields", async () => {
  api.defaults.adapter = async (config) => response(config, envelope({ ...user, accessToken: "must not enter state" }))
  assert.deepEqual(await AuthService.loginUser(credentials), user)
  await assert.rejects(AuthService.loginAdmin(credentials), { kind: "unknown" })
  api.defaults.adapter = async (config) => response(config, envelope({ ...admin, role: "Support" }))
  await assert.rejects(AuthService.loginAdmin(credentials), { kind: "unknown" })
  api.defaults.adapter = async (config) => response(config, envelope(null))
  await assert.rejects(AuthService.loginUser(credentials), { kind: "unknown" })
})

test("concurrent refresh requests cannot silently join a different auth realm", async () => {
  const coordinator = createRefreshCoordinator()
  const gate = deferred()
  let calls = 0
  const execute = async () => { calls += 1; await gate.promise; return envelope(user) }
  const pending = coordinator.refresh(execute, "user")
  await assert.rejects(coordinator.refresh(execute, "admin"), { kind: "unknown" })
  gate.resolve()
  await pending
  assert.equal(calls, 1)
})

test("dashboard cold reload hydrates identity and StrictMode rotates only once", async () => {
  const gate = deferred()
  let calls = 0
  api.defaults.adapter = async (config) => {
    calls += 1
    assert.equal(config.url, "/api/v1/auth/refresh")
    await gate.promise
    return response(config, envelope({ ...user, accessToken: "secret" }))
  }
  mountProvider("/dashboard/bots/example", true)
  assert.equal(latestAuth.status, "bootstrapping")
  await act(async () => { gate.resolve(); await refreshCoordinator.getPendingRefresh() })
  await waitFor(() => assert.equal(latestAuth.status, "authenticated"))
  assert.deepEqual(latestAuth.user, user)
  assert.equal(latestAuth.realm, "user")
  assert.equal(calls, 1)
  assert.equal(refreshCoordinator.resolveRealm(), "user")
})

test("admin cold reload and admin login bootstrap use only the admin refresh endpoint", async () => {
  for (const pathname of ["/admin/users", "/admin/login"]) {
    let calls = 0
    api.defaults.adapter = async (config) => {
      calls += 1
      assert.equal(config.url, "/api/v1/admin/auth/refresh")
      return response(config, envelope(admin))
    }
    mountProvider(pathname)
    await waitFor(() => assert.equal(latestAuth.status, "authenticated"))
    assert.equal(latestAuth.realm, "admin")
    assert.deepEqual(latestAuth.user, admin)
    assert.equal(calls, 1)
    cleanup()
    refreshCoordinator.setSessionRealm(null)
  }
})

test("bootstrap failure leaves anonymous state and sends the proper realm login redirect", async () => {
  for (const realm of ["user", "admin"]) {
    const pathname = realm === "user" ? "/dashboard/bots" : "/admin/users"
    window.history.replaceState(null, "", pathname)
    const paths = []
    api.defaults.adapter = async (config) => { paths.push(config.url); throw failure(config, 401, "Refresh token does not exist in cookies") }
    mountedRouter = createMemoryRouter(guardedRoutes(realm), { initialEntries: [pathname] })
    render(h(AuthProvider, null, h(Probe), h(RouterProvider, { router: mountedRouter })))
    await screen.findByText(realm === "user" ? "User login destination" : "Admin login destination")
    assert.equal(latestAuth.status, "anonymous")
    assert.equal(latestAuth.user, null)
    assert.equal(paths.length, 1)
    assert.equal(mountedRouter.state.location.state.from, pathname)
    cleanup()
    mountedRouter.dispose()
    refreshCoordinator.setSessionRealm(null)
  }
})

test("public login starts anonymous; successful user login and logout update context", async () => {
  const paths = []
  api.defaults.adapter = async (config) => { paths.push(config.url); return response(config, envelope(config.url.endsWith("logout") ? true : user)) }
  mountProvider()
  assert.equal(latestAuth.status, "anonymous")
  assert.equal(paths.length, 0)
  await act(async () => { await latestAuth.loginUser(credentials) })
  assert.deepEqual(latestAuth.user, user)
  assert.equal(latestAuth.realm, "user")
  await act(async () => { await latestAuth.logout() })
  assert.equal(latestAuth.status, "anonymous")
  assert.equal(latestAuth.user, null)
  assert.equal(latestAuth.realm, null)
  assert.deepEqual(paths, ["/api/v1/auth/login", "/api/v1/auth/logout"])
})

test("admin login registers admin realm for subsequent refresh and logout actions", async () => {
  const paths = []
  api.defaults.adapter = async (config) => { paths.push(config.url); return response(config, envelope(config.url.endsWith("logout") ? true : admin)) }
  mountProvider()
  await act(async () => { await latestAuth.loginAdmin(credentials) })
  await act(async () => { await latestAuth.refresh() })
  assert.equal(latestAuth.realm, "admin")
  await act(async () => { await latestAuth.logout() })
  assert.equal(latestAuth.status, "anonymous")
  assert.deepEqual(paths, ["/api/v1/admin/auth/login", "/api/v1/admin/auth/refresh", "/api/v1/admin/auth/logout"])
})

test("interceptor refresh success hydrates updated identity in the auth context", async () => {
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("/login")) return response(config, envelope(user))
    if (config.url.endsWith("/refresh")) return response(config, envelope({ ...user, name: "Updated Name" }))
    if (!config._authRetry) throw failure(config)
    return response(config, envelope(true))
  }
  mountProvider()
  await act(async () => { await latestAuth.loginUser(credentials) })
  await act(async () => { await api.get("/api/v1/connectedaccounts") })
  assert.equal(latestAuth.user.name, "Updated Name")
  assert.equal(latestAuth.status, "authenticated")
})

test("single-session mismatch clears identity and redirects without a refresh loop", async () => {
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    if (config.url.endsWith("refresh")) return response(config, envelope(user))
    throw failure(config, 401, { message: "Your session has expired or ended because you logged in from another device." })
  }
  window.history.replaceState(null, "", "/dashboard")
  mountedRouter = createMemoryRouter(guardedRoutes(), { initialEntries: ["/dashboard"] })
  render(h(AuthProvider, null, h(Probe), h(RouterProvider, { router: mountedRouter })))
  await screen.findByText("Protected content")
  await act(async () => { await assert.rejects(api.get("/api/v1/connectedaccounts"), { kind: "session" }) })
  await screen.findByText("User login destination")
  assert.equal(latestAuth.user, null)
  assert.equal(latestAuth.status, "anonymous")
  assert.deepEqual(paths, ["/api/v1/auth/refresh", "/api/v1/connectedaccounts"])
})

test("logout waits for pending rotation and cannot be undone by stale refresh hydration", async () => {
  const gate = deferred()
  const started = deferred()
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    if (config.url.endsWith("refresh")) { started.resolve(); await gate.promise }
    return response(config, envelope(config.url.endsWith("logout") ? true : user))
  }
  mountProvider()
  await act(async () => { await latestAuth.loginUser(credentials) })
  let rotation, signout
  await act(async () => {
    rotation = latestAuth.refresh()
    await started.promise
    signout = latestAuth.logout()
    await Promise.resolve()
  })
  assert.equal(paths.includes("/api/v1/auth/logout"), false)
  await act(async () => { gate.resolve(); await rotation; await signout })
  assert.equal(latestAuth.status, "anonymous")
  assert.equal(latestAuth.user, null)
  assert.deepEqual(paths, ["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout"])
})

test("ordinary backend logout failures preserve authenticated identity", async () => {
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("login")) return response(config, envelope(user))
    throw failure(config, 500, { message: "Unable to sign out." })
  }
  mountProvider()
  await act(async () => { await latestAuth.loginUser(credentials) })
  await act(async () => { await assert.rejects(latestAuth.logout(), { message: "Unable to sign out." }) })
  assert.equal(latestAuth.status, "authenticated")
  assert.deepEqual(latestAuth.user, user)
})

test("new login waits for an older rotation before setting a new realm's cookies", async () => {
  const gate = deferred()
  const started = deferred()
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    if (config.url.endsWith("refresh")) { started.resolve(); await gate.promise }
    return response(config, envelope(config.url.includes("/admin/") ? admin : user))
  }
  mountProvider()
  await act(async () => { await latestAuth.loginUser(credentials) })
  let rotation, newLogin
  await act(async () => {
    rotation = latestAuth.refresh()
    await started.promise
    newLogin = latestAuth.loginAdmin(credentials)
    await Promise.resolve()
  })
  assert.equal(paths.includes("/api/v1/admin/auth/login"), false)
  await act(async () => { gate.resolve(); await rotation; await newLogin })
  assert.equal(latestAuth.realm, "admin")
  assert.deepEqual(latestAuth.user, admin)
  assert.deepEqual(paths, ["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/admin/auth/login"])
})

test("a successful envelope with invalid refresh identity cannot authenticate the provider", async () => {
  api.defaults.adapter = async (config) => response(config, envelope({ ...admin, role: "SystemAdmin" }))
  mountProvider("/admin/users")
  await waitFor(() => assert.equal(latestAuth.status, "anonymous"))
  assert.equal(latestAuth.user, null)
  assert.ok(refreshCoordinator.getExpiredError())
})

test("auth guard waits for bootstrap and does not render protected content or redirect", () => {
  mountRouter(guardedRoutes(), "/dashboard", fakeAuth("bootstrapping"))
  assert.ok(screen.getByRole("status", { name: "Loading page" }))
  assert.equal(screen.queryByText("Protected content"), null)
  assert.equal(mountedRouter.state.location.pathname, "/dashboard")
})

test("auth guard redirects anonymous users to the correct login and preserves destination", async () => {
  for (const realm of ["user", "admin"]) {
    const pathname = realm === "user" ? "/dashboard/bots?tab=all#recent" : "/admin/users?search=alice"
    mountRouter(guardedRoutes(realm), pathname, fakeAuth("anonymous"))
    await screen.findByText(realm === "user" ? "User login destination" : "Admin login destination")
    assert.equal(mountedRouter.state.location.state.from, pathname)
    cleanup()
    mountedRouter.dispose()
  }
})

test("role boundaries accept only the documented roles for each workspace", async () => {
  for (const [realm, role, allowed] of [["user", "User", true], ["user", "Admin", false], ["admin", "User", false], ["admin", "Admin", true], ["admin", "SuperAdmin", true], ["admin", "Support", false], ["admin", "SystemAdmin", false]]) {
    mountRouter(guardedRoutes(realm), realm === "user" ? "/dashboard" : "/admin", fakeAuth("authenticated", role === "User" ? "user" : "admin", { ...user, role }))
    assert.ok(screen.getByText(allowed ? "Protected content" : "Access denied"))
    cleanup()
    mountedRouter.dispose()
  }
})

test("role guard alone also waits until bootstrap settles", () => {
  mountRouter([{ element: h(RequireRole, { roles: ["User"] }), children: [{ path: "/dashboard", element: h("p", null, "Protected content") }] }], "/dashboard", fakeAuth("bootstrapping"))
  assert.ok(screen.getByRole("status", { name: "Loading page" }))
  assert.equal(screen.queryByText("Access denied"), null)
})

test("root redirect waits for bootstrap and routes authenticated identity by realm", async () => {
  for (const [status, realm, expected] of [["bootstrapping", null, "/"], ["anonymous", null, "/login"], ["authenticated", "user", "/dashboard"], ["authenticated", "admin", "/admin"]]) {
    mountRouter([{ path: "/", element: h(RootRedirectPage) }, { path: "/login", element: h("p", null, "Login") }, { path: "/dashboard", element: h("p", null, "User home") }, { path: "/admin", element: h("p", null, "Admin home") }], "/", fakeAuth(status, realm, realm === "admin" ? admin : user))
    await waitFor(() => assert.equal(mountedRouter.state.location.pathname, expected))
    cleanup()
    mountedRouter.dispose()
  }
})

test("login form validates email/password before any backend request", async () => {
  let calls = 0
  api.defaults.adapter = async () => { calls += 1; throw new Error("Should not submit") }
  window.history.replaceState(null, "", "/login")
  mountedRouter = createMemoryRouter([{ path: "/login", element: h(LoginForm, { realm: "user" }) }], { initialEntries: ["/login"] })
  render(h(AuthProvider, null, h(RouterProvider, { router: mountedRouter })))
  const input = userEvent.setup({ document: window.document })
  await input.click(screen.getByRole("button", { name: "Sign in" }))
  await screen.findByText("Enter a valid email address.")
  assert.ok(screen.getByText("Enter your password."))
  assert.equal(calls, 0)
})

test("login form displays backend messages without stack traces or refresh attempts", async () => {
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    throw failure(config, 401, { isSuccess: false, statusCode: 401, message: "Invalid credentials.", path: config.url, method: "POST", traceId: "trace", details: "private stack trace", innerException: "private exception" })
  }
  window.history.replaceState(null, "", "/login")
  mountedRouter = createMemoryRouter([{ path: "/login", element: h(LoginForm, { realm: "user" }) }], { initialEntries: ["/login"] })
  render(h(AuthProvider, null, h(RouterProvider, { router: mountedRouter })))
  const input = userEvent.setup({ document: window.document })
  await input.type(screen.getByLabelText("Email address"), credentials.email)
  await input.type(screen.getByLabelText("Password"), credentials.password)
  await input.click(screen.getByRole("button", { name: "Sign in" }))
  await screen.findByText("Invalid credentials.")
  assert.equal(document.body.textContent.includes("private stack"), false)
  assert.equal(document.body.textContent.includes("private exception"), false)
  assert.deepEqual(paths, ["/api/v1/auth/login"])
})

test("successful login returns to a protected path within the authenticated realm", async () => {
  api.defaults.adapter = async (config) => response(config, envelope(user))
  mountedRouter = createMemoryRouter([{ path: "/login", element: h(LoginForm, { realm: "user" }) }, { path: "/dashboard/bots", element: h("p", null, "Bots destination") }], {
    initialEntries: [{ pathname: "/login", state: { from: "/dashboard/bots?sort=name" } }],
  })
  render(h(AuthProvider, null, h(RouterProvider, { router: mountedRouter })))
  const input = userEvent.setup({ document: window.document })
  await input.type(screen.getByLabelText("Email address"), credentials.email)
  await input.type(screen.getByLabelText("Password"), credentials.password)
  await input.click(screen.getByRole("button", { name: "Sign in" }))
  await screen.findByText("Bots destination")
  assert.equal(mountedRouter.state.location.search, "?sort=name")
})

test("admin login form bootstraps then submits to the admin endpoint and enters admin home", async () => {
  const paths = []
  api.defaults.adapter = async (config) => {
    paths.push(config.url)
    if (config.url.endsWith("refresh")) throw failure(config)
    return response(config, envelope(admin))
  }
  window.history.replaceState(null, "", "/admin/login")
  mountedRouter = createMemoryRouter([{ path: "/admin/login", element: h(LoginForm, { realm: "admin" }) }, { path: "/admin", element: h("p", null, "Admin home") }], { initialEntries: ["/admin/login"] })
  render(h(AuthProvider, null, h(RouterProvider, { router: mountedRouter })))
  const input = userEvent.setup({ document: window.document })
  await screen.findByLabelText("Admin email")
  await input.type(screen.getByLabelText("Admin email"), admin.email)
  await input.type(screen.getByLabelText("Password"), credentials.password)
  await input.click(screen.getByRole("button", { name: "Continue to admin" }))
  await screen.findByText("Admin home")
  assert.deepEqual(paths, ["/api/v1/admin/auth/refresh", "/api/v1/admin/auth/login"])
})

test("post-login destinations reject external URLs, wrong realms, path lookalikes and login loops", () => {
  for (const from of ["https://evil.example", "//evil.example", "http://[", "/dashboardish", "/admin/users", "/dashboard/../../admin"]) {
    assert.equal(navigation.getLoginDestination("user", { from }), "/dashboard")
  }
  assert.equal(navigation.getLoginDestination("admin", { from: "/admin/login" }), "/admin")
  assert.equal(navigation.getLoginDestination("admin", { from: "/admin/login/" }), "/admin")
  assert.equal(navigation.getLoginDestination("admin", { from: "/admin/%6cogin" }), "/admin")
  assert.equal(navigation.getLoginDestination("admin", { from: "/admin/%invalid" }), "/admin")
  assert.equal(navigation.getLoginDestination("admin", { from: "/admin/users?search=alice" }), "/admin/users?search=alice")
  assert.equal(navigation.getBootstrapRealm("/administrator"), null)
  assert.equal(navigation.getBootstrapRealm("/dashboardish"), null)
})

test("every real client, bot and admin route is behind auth and role boundaries", () => {
  for (const pathname of ["/dashboard", "/dashboard/settings", "/dashboard/bots", "/dashboard/bots/example", "/dashboard/bots/example/leads", "/admin", "/admin/users", "/admin/bots", "/admin/subscriptions", "/admin/transactions"]) {
    const matches = matchRoutes(appRoutes, pathname)
    const realm = pathname.startsWith("/admin") ? "admin" : "user"
    const authMatch = matches.find(({ route }) => route.element?.type === RequireAuth)
    const roleMatch = matches.find(({ route }) => route.element?.type === RequireRole)
    assert.equal(authMatch.route.element.props.realm, realm)
    assert.deepEqual(roleMatch.route.element.props.roles, realm === "user" ? ["User"] : ["Admin", "SuperAdmin"])
  }
  for (const pathname of ["/login", "/admin/login"]) {
    assert.equal(matchRoutes(appRoutes, pathname).some(({ route }) => route.element?.type === RequireAuth), false)
  }
})

test("real application routes send an anonymous protected visit to a working login page", async () => {
  api.defaults.adapter = async (config) => { throw failure(config) }
  window.history.replaceState(null, "", "/dashboard/bots/example")
  mountedRouter = createMemoryRouter(appRoutes, { initialEntries: ["/dashboard/bots/example"] })
  render(h(AuthProvider, null, h(RouterProvider, { router: mountedRouter })))
  await screen.findByRole("form", { name: "User sign in" })
  assert.equal(mountedRouter.state.location.pathname, "/login")
  assert.ok(screen.getByRole("button", { name: "Sign in" }))
})

test("account menu displays identity and invokes sign-out with a safe failure message", async () => {
  api.defaults.adapter = async (config) => {
    if (config.url.endsWith("login")) return response(config, envelope(user))
    throw failure(config, 500, { message: "Unable to sign out." })
  }
  mountProvider("/login", false, h(React.Fragment, null, h(Probe), h(SidebarProvider, null, h(DashboardHeader, { title: "Workspace" }))))
  await act(async () => { await latestAuth.loginUser(credentials) })
  assert.ok(screen.getByText(user.name))
  const input = userEvent.setup({ document: window.document })
  await input.click(screen.getByRole("button", { name: "Open account menu" }))
  await input.click(await screen.findByRole("menuitem", { name: "Sign out" }))
  await screen.findByText("Unable to sign out.")
  assert.equal(latestAuth.status, "authenticated")
})
