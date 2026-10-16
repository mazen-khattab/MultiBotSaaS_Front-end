import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { render, type RenderOptions } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement, ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"

import { AuthProvider } from "@/context/auth/AuthProvider"
import { createTestQueryClient } from "@/test/queryClient"

interface ProviderOptions {
  readonly route?: string
  readonly queryClient?: QueryClient
}

/** Use real Auth context and a fresh deterministic Query client. Realtime is
 * intentionally omitted: HTTP component tests must not open a live hub. */
export function createTestProviders({ route = "/login", queryClient = createTestQueryClient() }: ProviderOptions = {}) {
  // Auth bootstrap uses the browser pathname; MemoryRouter owns in-test routing.
  window.history.replaceState(null, "", route)
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>
      <AuthProvider><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></AuthProvider>
    </MemoryRouter>
  }
  return { Wrapper, queryClient }
}

export function renderWithProviders(ui: ReactElement, options: ProviderOptions & Omit<RenderOptions, "wrapper"> = {}) {
  const { route, queryClient: suppliedClient, ...renderOptions } = options
  const { Wrapper, queryClient } = createTestProviders({ route, queryClient: suppliedClient })
  return { ...render(ui, { ...renderOptions, wrapper: Wrapper }), queryClient, user: userEvent.setup() }
}
