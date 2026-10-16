import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Link, MemoryRouter } from "react-router-dom"
import { expect, test } from "vitest"

import { RouteLoadingState } from "@/shared/components/feedback/RouteLoadingState"

test("loading follows the router's realm even when the browser URL differs", async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <RouteLoadingState />
      <Link to="/dashboard/bots/73">Client workspace</Link>
      <Link to="/admin/bots">Admin workspace</Link>
    </MemoryRouter>,
  )
  expect(screen.getByRole("status", { name: "Loading page" })).not.toHaveClass("client-theme")
  await user.click(screen.getByRole("link", { name: "Client workspace" }))
  expect(screen.getByRole("status", { name: "Loading page" })).toHaveClass("client-theme")
  await user.click(screen.getByRole("link", { name: "Admin workspace" }))
  expect(screen.getByRole("status", { name: "Loading page" })).not.toHaveClass("client-theme")
})

test.each(["/dashboard", "/admin/login"])("loading works before RouterProvider mounts at %s", (pathname) => {
  const originalUrl = window.location.href
  try {
    window.history.replaceState(null, "", pathname)
    render(<RouteLoadingState />)
    const loading = screen.getByRole("status", { name: "Loading page" })
    expect(loading.classList.contains("client-theme")).toBe(pathname === "/dashboard")
  } finally {
    window.history.replaceState(null, "", originalUrl)
  }
})
