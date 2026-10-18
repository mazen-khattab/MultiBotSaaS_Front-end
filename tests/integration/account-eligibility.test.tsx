import { QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { http, HttpResponse } from "msw/http"
import { expect, test, vi } from "vitest"

import { queryKeys } from "@/core/query/queryKeys"
import { useMessagingAccounts } from "@/features/leads/hooks/useMessagingAccounts"
import { useEligibleAccounts } from "@/features/runs/hooks/useEligibleAccounts"
import { accountDto, messagingAccountDto, apiOrigin, apiSuccess } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { createTestQueryClient } from "@/test/queryClient"

test("scraping and messaging eligibility stay separate for the same bot and both refresh after account changes", async () => {
  const scrapingReads = vi.fn()
  const messagingReads = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/73`, ({ request }) => {
      expect(request.credentials).toBe("include")
      expect(new URL(request.url).search).toBe("")
      scrapingReads()
      return HttpResponse.json(apiSuccess([accountDto]))
    }),
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/messaging/73`, ({ request }) => {
      expect(request.credentials).toBe("include")
      expect(new URL(request.url).search).toBe("")
      messagingReads()
      return HttpResponse.json(apiSuccess([messagingAccountDto]))
    }),
  )
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  // Mount both consumers together: identical keys would deduplicate the requests
  // and make both pickers receive one endpoint's account list.
  const { result } = renderHook(() => ({
    scraping: useEligibleAccounts(73),
    messaging: useMessagingAccounts(73),
  }), { wrapper })
  await waitFor(() => {
    expect(result.current.scraping.isSuccess).toBe(true)
    expect(result.current.messaging.isSuccess).toBe(true)
  })
  expect(result.current.scraping.data?.map(({ id }) => id)).toEqual([12])
  expect(result.current.messaging.data?.map(({ id }) => id)).toEqual([13])
  expect(scrapingReads).toHaveBeenCalledTimes(1)
  expect(messagingReads).toHaveBeenCalledTimes(1)

  const scrapingKey = queryKeys.accounts.list({ botId: 73, eligible: true, type: "Scraping" })
  const messagingKey = queryKeys.accounts.list({ botId: 73, eligible: true, type: "Messaging" })
  expect(client.getQueryData(scrapingKey)).toEqual(result.current.scraping.data)
  expect(client.getQueryData(messagingKey)).toEqual(result.current.messaging.data)
  await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.accounts.all }) })
  expect(scrapingReads).toHaveBeenCalledTimes(2)
  expect(messagingReads).toHaveBeenCalledTimes(2)
  expect(client.getQueryData(scrapingKey)).toEqual(result.current.scraping.data)
  expect(client.getQueryData(messagingKey)).toEqual(result.current.messaging.data)
})
