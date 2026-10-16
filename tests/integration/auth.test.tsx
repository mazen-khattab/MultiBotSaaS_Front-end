import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { Route, Routes, useLocation } from "react-router-dom"
import { expect, test } from "vitest"

import { RequireAuth } from "@/app/router/RequireAuth"
import { RequireRole } from "@/app/router/RequireRole"
import { useAuth } from "@/context/auth/useAuth"
import { AuthService } from "@/services/auth/AuthService"
import type { AuthRealm } from "@/services/auth/auth.types"
import { adminIdentity, apiOrigin, apiSuccess, userIdentity } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

/** Exercise the actual context actions and identity, not a mocked provider value. */
function AuthProbe() {
  const auth = useAuth()
  return <>
    <output aria-label="Identity">{auth.status}:{auth.realm}:{auth.user?.name}</output>
    <button onClick={() => { void auth.loginUser({ email: userIdentity.email, password: "test-only-password" }) }}>User login</button>
    <button onClick={() => { void auth.loginAdmin({ email: adminIdentity.email, password: "test-only-password" }) }}>Admin login</button>
    <button onClick={() => { void auth.logout() }}>Sign out</button>
  </>
}
function LoginDestination() {
  const location = useLocation()
  return <p>Sign in at {location.pathname}; return to {location.state?.from}</p>
}

test.each<AuthRealm>(["user", "admin"])("%s logout rejects a historical boolean acknowledgment", async (realm) => {
  const path = realm === "user" ? "/api/v1/auth/logout" : "/api/v1/admin/auth/logout"
  server.use(http.post(`${apiOrigin}${path}`, () => HttpResponse.json(apiSuccess(true))))
  await expect(realm === "user" ? AuthService.logoutUser() : AuthService.logoutAdmin()).rejects.toMatchObject({ kind: "unknown" })
})

test.each<AuthRealm>(["user", "admin"])("%s identity bootstraps through /me without rotating cookies", async (realm) => {
  const calls: string[] = []
  const base = realm === "user" ? "/api/v1/auth" : "/api/v1/admin/auth"
  const identity = realm === "user" ? userIdentity : adminIdentity
  server.use(
    http.get(`${apiOrigin}${base}/me`, () => { calls.push("me"); return HttpResponse.json(apiSuccess(identity)) }),
    http.post(`${apiOrigin}${base}/refresh`, () => { calls.push("refresh"); return HttpResponse.json(apiSuccess(identity)) }),
  )
  renderWithProviders(<AuthProbe />, { route: realm === "user" ? "/dashboard" : "/admin" })
  await waitFor(() => expect(screen.getByLabelText("Identity")).toHaveTextContent(`authenticated:${realm}:${identity.name}`))
  expect(calls).toEqual(["me"])
})

test.each<AuthRealm>(["user", "admin"])("%s login and null logout acknowledgment update the real context", async (realm) => {
  const { user } = renderWithProviders(<AuthProbe />)
  expect(screen.getByLabelText("Identity")).toHaveTextContent("anonymous")
  await user.click(screen.getByRole("button", { name: realm === "user" ? "User login" : "Admin login" }))
  await waitFor(() => expect(screen.getByLabelText("Identity")).toHaveTextContent(`authenticated:${realm}`))
  await user.click(screen.getByRole("button", { name: "Sign out" }))
  await waitFor(() => expect(screen.getByLabelText("Identity")).toHaveTextContent("anonymous"))
  expect(window.localStorage.length).toBe(0)
  expect(window.sessionStorage.length).toBe(0)
})

test.each<AuthRealm>(["user", "admin"])("anonymous %s guard redirects to the realm login and preserves destination", async (realm) => {
  const base = realm === "user" ? "/api/v1/auth" : "/api/v1/admin/auth"
  const route = realm === "user" ? "/dashboard/settings?tab=company" : "/admin/users?search=test"
  const login = realm === "user" ? "/login" : "/admin/login"
  server.use(
    http.get(`${apiOrigin}${base}/me`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${apiOrigin}${base}/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
  renderWithProviders(<Routes>
    <Route element={<RequireAuth realm={realm} />}><Route path={realm === "user" ? "/dashboard/settings" : "/admin/users"} element={<p>Protected content</p>} /></Route>
    <Route path={login} element={<LoginDestination />} />
  </Routes>, { route })
  expect(await screen.findByText(`Sign in at ${login}; return to ${route}`)).toBeInTheDocument()
  expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
})

test("a real User identity cannot enter Admin role-guarded content", async () => {
  renderWithProviders(<Routes>
    <Route element={<RequireRole roles={["Admin", "SuperAdmin"]} />}><Route path="/dashboard" element={<p>Admin content</p>} /></Route>
  </Routes>, { route: "/dashboard" })
  expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument()
  expect(screen.queryByText("Admin content")).not.toBeInTheDocument()
})
