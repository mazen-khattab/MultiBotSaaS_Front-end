import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, beforeEach, expect } from "vitest"

import { refreshCoordinator } from "@/core/api/refreshCoordinator"
import { server } from "@/test/mocks/server"
import { clearTestQueryClients } from "@/test/queryClient"

const unhandledRequests: string[] = []

beforeAll(() => server.listen({
  async onUnhandledFrame({ frame, defaults }) {
    // Fail even if a component catches the transport rejection and renders an
    // error. A missing/typoed endpoint must never silently reach the real API.
    unhandledRequests.push(await frame.getUnhandledMessage())
    defaults.error()
  },
}))
beforeEach(() => {
  window.history.replaceState(null, "", "/login")
  refreshCoordinator.setSessionRealm(null)
  unhandledRequests.length = 0
})
afterEach(async () => {
  cleanup()
  clearTestQueryClients()
  await refreshCoordinator.getPendingRefresh()?.catch(() => undefined)
  server.resetHandlers()
  window.localStorage.clear()
  window.sessionStorage.clear()
  expect(unhandledRequests).toEqual([])
})
afterAll(() => server.close())
