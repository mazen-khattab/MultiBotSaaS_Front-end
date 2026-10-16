import { Suspense } from "react"
import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { expect, test, vi } from "vitest"
import { z } from "zod"

import GroupsPage from "@/features/groups/pages/GroupsPage"
import { createGroupsPageConfig } from "@/features/groups/forms/groupFormConfig"
import { botModulesRegistry } from "@/registry/botModulesRegistry"
import { apiOrigin, apiSuccess, groupDetailsDto } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

const MemberGroupsPage = botModulesRegistry["FB-MEMBERS-SCRAPER"]!.resolveComponent("groups")!

function MemberGroups({ botId = "73" }: { readonly botId?: string }) {
  return <Suspense fallback={<p>Loading groups…</p>}><MemberGroupsPage botId={botId} /></Suspense>
}

async function openCreate() {
  const result = renderWithProviders(<MemberGroups />)
  await result.user.click(await screen.findByRole("button", { name: "Add group" }))
  await result.user.type(screen.getByLabelText("Group name"), "Member community")
  await result.user.type(screen.getByLabelText("Group URL"), "https://www.facebook.com/groups/community")
  return result
}

test("the member module renders count fields and sends numeric settings as configJson", async () => {
  const writes = vi.fn()
  server.use(http.post(`${apiOrigin}/api/v1/targetgroups`, async ({ request }) => {
    writes(await request.json())
    return HttpResponse.json(apiSuccess(null))
  }))
  const { user } = await openCreate()
  expect(screen.queryByLabelText("Configuration JSON")).not.toBeInTheDocument()
  await user.type(screen.getByLabelText("Group members count"), "10000")
  await user.type(screen.getByLabelText("Scrape members per count"), "200")
  await user.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Target group created.")
  expect(writes).toHaveBeenCalledExactlyOnceWith({
    botId: 73, groupName: "Member community", groupUrl: "https://www.facebook.com/groups/community", isActive: true,
    configJson: '{"groupMembersCount":10000,"scrapeMembersPerCount":200}',
  })
})

test.each([
  ["", "Enter the scrape members per count."],
  ["0", "Enter a number greater than zero."],
  ["-2", "Enter a number greater than zero."],
  ["1.5", "Enter a whole number."],
])("invalid member count %j prevents writes", async (value, message) => {
  const writes = vi.fn()
  server.use(http.post(`${apiOrigin}/api/v1/targetgroups`, () => {
    writes()
    return HttpResponse.json(apiSuccess(null))
  }))
  const { user } = await openCreate()
  await user.type(screen.getByLabelText("Group members count"), "1000")
  if (value) await user.type(screen.getByLabelText("Scrape members per count"), value)
  await user.click(screen.getByRole("button", { name: "Save group" }))
  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(writes).not.toHaveBeenCalled()
})

test("both member fields are required", async () => {
  const { user } = await openCreate()
  await user.click(screen.getByRole("button", { name: "Save group" }))
  expect(await screen.findByText("Enter the group members count.")).toBeInTheDocument()
  expect(screen.getByText("Enter the scrape members per count.")).toBeInTheDocument()
})

test("editing restores counts and preserves configuration beyond the visible fields", async () => {
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/TargetGroups/73/5`, () => HttpResponse.json(apiSuccess({
      ...groupDetailsDto, configJson: '{"groupMembersCount":5000,"scrapeMembersPerCount":100,"keywords":["founder"]}',
    }))),
    http.put(`${apiOrigin}/api/v1/targetgroups/5`, async ({ request }) => {
      writes(await request.json())
      return HttpResponse.json(apiSuccess(null))
    }),
  )
  const { user } = renderWithProviders(<MemberGroups />)
  await user.click(await screen.findByRole("button", { name: `Edit ${groupDetailsDto.groupName}` }))
  const count = await screen.findByLabelText("Scrape members per count")
  expect(screen.getByLabelText("Group members count")).toHaveValue(5000)
  expect(count).toHaveValue(100)
  await user.clear(count)
  expect(count).toHaveValue(null)
  await user.type(count, "250")
  await user.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Target group updated.")
  expect(writes).toHaveBeenCalledExactlyOnceWith({
    groupName: groupDetailsDto.groupName, groupUrl: groupDetailsDto.groupUrl, isActive: true,
    configJson: '{"groupMembersCount":5000,"scrapeMembersPerCount":250,"keywords":["founder"]}',
  })
})

test("a different bot can define text and boolean settings without changing the group form", async () => {
  const config = createGroupsPageConfig({
    schema: z.object({ keyword: z.string().trim().min(1), includeReplies: z.boolean() }),
    fields: [{ name: "keyword", type: "text", label: "Keyword", required: true },
      { name: "includeReplies", type: "checkbox", label: "Include replies" }],
  })
  const writes = vi.fn()
  server.use(http.post(`${apiOrigin}/api/v1/targetgroups`, async ({ request }) => {
    writes(await request.json())
    return HttpResponse.json(apiSuccess(null))
  }))
  const { user } = renderWithProviders(<GroupsPage botId="73" config={config} />)
  await user.click(screen.getByRole("button", { name: "Add group" }))
  expect(screen.queryByLabelText("Group members count")).not.toBeInTheDocument()
  await user.type(screen.getByLabelText("Group name"), "Other group")
  await user.type(screen.getByLabelText("Group URL"), "https://example.test/group")
  await user.type(screen.getByLabelText("Keyword"), "  founder  ")
  await user.click(screen.getByLabelText("Include replies"))
  await user.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Target group created.")
  expect(writes).toHaveBeenCalledExactlyOnceWith({
    botId: 73, groupName: "Other group", groupUrl: "https://example.test/group", isActive: true,
    configJson: '{"keyword":"founder","includeReplies":true}',
  })
})

test("failed saves retain the entered count settings for an explicit retry", async () => {
  let attempts = 0
  server.use(http.post(`${apiOrigin}/api/v1/targetgroups`, () => {
    attempts++
    return attempts === 1
      ? HttpResponse.json({ statusCode: 400, message: "Group could not be saved." }, { status: 400 })
      : HttpResponse.json(apiSuccess(null))
  }))
  const { user } = await openCreate()
  await user.type(screen.getByLabelText("Group members count"), "1000")
  await user.type(screen.getByLabelText("Scrape members per count"), "100")
  await user.click(screen.getByRole("button", { name: "Save group" }))
  expect(await screen.findByText("Group could not be saved.")).toBeInTheDocument()
  expect(screen.getByLabelText("Group members count")).toHaveValue(1000)
  expect(screen.getByLabelText("Scrape members per count")).toHaveValue(100)
  await waitFor(() => expect(screen.getByRole("button", { name: "Save group" })).toBeEnabled())
  await user.click(screen.getByRole("button", { name: "Save group" }))
  await screen.findByText("Target group created.")
  expect(attempts).toBe(2)
})

test("existing non-object configuration stays editable without silently losing data", async () => {
  server.use(http.get(`${apiOrigin}/api/v1/TargetGroups/73/5`, () => HttpResponse.json(apiSuccess({
    ...groupDetailsDto, configJson: '["legacy"]',
  }))))
  const { user } = renderWithProviders(<MemberGroups />)
  await user.click(await screen.findByRole("button", { name: `Edit ${groupDetailsDto.groupName}` }))
  expect(await screen.findByLabelText("Configuration JSON")).toHaveValue('["legacy"]')
})
