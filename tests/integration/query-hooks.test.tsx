import { renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { expect, test } from "vitest"

import { queryKeys } from "@/core/query/queryKeys"
import { useGroup } from "@/features/groups/hooks/useGroup"
import { useLeads } from "@/features/leads/hooks/useLeads"
import { apiOrigin, apiPage, apiSuccess, groupDetailsDto, leadDto } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { createTestProviders } from "@/test/renderWithProviders"

test("lead queries preserve bot, page, size and status at the HTTP/cache boundary", async () => {
  const requests: string[] = []
  server.use(http.get(`${apiOrigin}/api/v1/leads/leads/73`, ({ request }) => {
    requests.push(new URL(request.url).search)
    const page = Number(new URL(request.url).searchParams.get("pageNumber"))
    return HttpResponse.json(apiSuccess(apiPage([{ ...leadDto, profileName: `Page ${page}` }], page, 42, 5)))
  }))
  const { Wrapper, queryClient } = createTestProviders()
  const initial = { botId: 73, pageNumber: 1, pageSize: 10, statusFilter: "Pending" }
  const { result, rerender } = renderHook((params) => useLeads(params), { initialProps: initial, wrapper: Wrapper })
  await waitFor(() => expect(result.current.data?.items[0]?.profileName).toBe("Page 1"))
  const next = { ...initial, pageNumber: 2, pageSize: 25, statusFilter: "Completed" }
  rerender(next)
  await waitFor(() => expect(result.current.data?.items[0]?.profileName).toBe("Page 2"))
  expect(requests.map((search) => Object.fromEntries(new URLSearchParams(search)))).toEqual([
    { pageNumber: "1", pageSize: "10", statusFilter: "Pending" },
    { pageNumber: "2", pageSize: "25", statusFilter: "Completed" },
  ])
  expect(queryClient.getQueryData(queryKeys.leads.list(initial))).toMatchObject({ currentPage: 1 })
  expect(queryClient.getQueryData(queryKeys.leads.list(next))).toMatchObject({ currentPage: 2 })
})

test("disabled group details make no request and enabled reads cache the adapted DTO", async () => {
  let reads = 0
  server.use(http.get(`${apiOrigin}/api/v1/TargetGroups/73/5`, () => { reads++; return HttpResponse.json(apiSuccess(groupDetailsDto)) }))
  const { Wrapper, queryClient } = createTestProviders()
  const initialProps: { id: number | null } = { id: null }
  const { result, rerender } = renderHook(({ id }: { id: number | null }) => useGroup(73, id), { initialProps, wrapper: Wrapper })
  expect(result.current.fetchStatus).toBe("idle")
  expect(reads).toBe(0)
  rerender({ id: 5 })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(reads).toBe(1)
  expect(queryClient.getQueryData(queryKeys.groups.detail(73, 5))).toMatchObject({ runsCount: 3, groupUrl: groupDetailsDto.groupUrl })
})
