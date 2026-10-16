import { expect, test } from "vitest"

import { queryKeys } from "@/core/query/queryKeys"
import { createJobRealtimeHandler } from "@/features/jobs/realtime/jobRealtimeHandlers"
import { createLeadRealtimeHandlers } from "@/features/leads/realtime/leadRealtimeHandlers"
import { createRunRealtimeHandler } from "@/features/runs/realtime/runRealtimeHandlers"
import { readSignalREvent, signalREvents } from "@/services/realtime/signalr.events"
import { apiPage, leadDto } from "@/test/fixtures/api.fixtures"
import { createTestQueryClient } from "@/test/queryClient"

test("completion invalidates existing scopes without adding counts or inventing final run data", async () => {
  const client = createTestQueryClient()
  const listKey = queryKeys.runs.list({ botId: 73, pageNumber: 2, pageSize: 10 })
  const detailKey = queryKeys.runs.detail(42)
  const run = { id: 42, status: "Running", collectedLeadsCount: 3, endedAt: null }
  client.setQueryData(listKey, apiPage([run], 2, 42, 5))
  client.setQueryData(detailKey, run)
  const payload = readSignalREvent("ScrapeCompleted", [{ scrapeId: 42, leadsCount: 5 }])!
  const reconcile = createRunRealtimeHandler(client)
  await reconcile(payload)
  await reconcile(payload)
  expect(client.getQueryState(listKey)?.isInvalidated).toBe(true)
  expect(client.getQueryState(detailKey)?.isInvalidated).toBe(true)
  expect(client.getQueryData(detailKey)).toEqual(run)
  expect(client.getQueryData(listKey)).toEqual(apiPage([run], 2, 42, 5))
})

test("lead status notifications invalidate filtered lists and quota without patching partial rows", async () => {
  const client = createTestQueryClient()
  const key = queryKeys.leads.list({ botId: 73, pageNumber: 3, statusFilter: "Pending" })
  const preview = queryKeys.leads.messagingPreview(73)
  const page = apiPage([leadDto], 3, 21, 3)
  client.setQueryData(key, page)
  client.setQueryData(preview, { allowedToProcessCount: 10 })
  await createLeadRealtimeHandlers(client).LeadStatusUpdated!(readSignalREvent("LeadStatusUpdated", [{ leadId: 101, status: "Completed" }])!)
  expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  expect(client.getQueryState(preview)?.isInvalidated).toBe(true)
  expect(client.getQueryData(key)).toEqual(page)
  expect(client.getQueryData(preview)).toEqual({ allowedToProcessCount: 10 })
})

test("a failed worker job never marks a same-numbered Scrape failed", async () => {
  const client = createTestQueryClient()
  const runKey = queryKeys.runs.detail(85), accountKey = queryKeys.accounts.list({ botId: 73 })
  client.setQueryData(runKey, { id: 85, status: "Running" })
  client.setQueryData(accountKey, [])
  await createJobRealtimeHandler(client)(readSignalREvent("JobFailed", [{ jobId: 85, message: "Worker timed out." }])!)
  expect(client.getQueryData(runKey)).toEqual({ id: 85, status: "Running" })
  expect(client.getQueryState(runKey)?.isInvalidated).toBe(false)
  expect(client.getQueryState(accountKey)?.isInvalidated).toBe(true)
})

test("only the three exact wire events are accepted, with no historical aliases or IDs", () => {
  expect(signalREvents).toEqual(["ScrapeCompleted", "LeadStatusUpdated", "JobFailed"])
  expect(readSignalREvent("ScrapeCompleted", [{ scrapeId: 42, leadsCount: 0 }])).toEqual({ scrapeId: 42, leadsCount: 0 })
  expect(readSignalREvent("ScrapeCompleted", [{ runId: 42, leadsCount: 5 }])).toBeUndefined()
  expect(readSignalREvent("LeadStatusUpdated", [{ leadId: 101, status: "Contacted" }])).toBeUndefined()
  // @ts-expect-error The historical alias is invalid at both type and runtime boundaries.
  expect(readSignalREvent("RunCompleted", [{ scrapeId: 42, leadsCount: 5 }])).toBeUndefined()
})
