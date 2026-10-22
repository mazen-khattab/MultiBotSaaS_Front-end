import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { Link, Route, Routes, useParams } from "react-router-dom"
import { expect, test, vi } from "vitest"

import { queryKeys } from "@/core/query/queryKeys"
import LeadDetailsPage from "@/features/leads/pages/LeadDetailsPage"
import { LeadsService } from "@/features/leads/services/LeadsService"
import type { UpdateLeadDto } from "@/features/leads/types/leads.types"
import { apiFailure, apiOrigin, apiSuccess, leadDetailsDto } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

const updateUrl = `${apiOrigin}/api/v1/Leads/UpdateLead/101`
const detailsRoute = "/dashboard/bots/73/leads/101"
const updated: UpdateLeadDto = {
  profileName: "Updated recipient",
  profileUrl: "https://example.test/updated-profile",
  aiMessage: "رسالة جديدة\n\nSecond paragraph.",
  status: "Ready for review",
}

async function openEditor() {
  fireEvent.click(await screen.findByRole("button", { name: "Edit lead" }))
  return within(screen.getByRole("form", { name: "Edit lead" }))
}

test.each(["envelope", "no content"])("update sends only the four editable strings and accepts %s", async (response) => {
  const writes = vi.fn()
  server.use(http.put(updateUrl, async ({ request }) => {
    writes(await request.json())
    expect(request.credentials).toBe("include")
    expect(new URL(request.url).search).toBe("")
    return response === "no content" ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(apiSuccess(null))
  }))
  // Structural typing permits extra properties. The service must strip them.
  await expect(LeadsService.updateLead(101, { ...leadDetailsDto, ...updated })).resolves.toBeUndefined()
  expect(writes).toHaveBeenCalledExactlyOnceWith(updated)
})

test("invalid IDs and non-string fields are rejected before HTTP", async () => {
  const writes = vi.fn()
  server.use(http.put(`${apiOrigin}/api/v1/Leads/UpdateLead/:id`, () => { writes(); return HttpResponse.json(apiSuccess(true)) }))
  for (const id of [0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await expect(LeadsService.updateLead(id, updated)).rejects.toHaveProperty("message")
  }
  await expect(LeadsService.updateLead(101, { ...updated, status: null } as unknown as UpdateLeadDto)).rejects.toHaveProperty("message")
  expect(writes).not.toHaveBeenCalled()
})

test.each([apiSuccess(false), { isSuccess: false, message: "Update rejected.", errorType: 1, data: null }, { unexpected: true }])("unsuccessful or malformed acknowledgments never report a saved lead", async (payload) => {
  server.use(http.put(updateUrl, () => HttpResponse.json(payload)))
  await expect(LeadsService.updateLead(101, updated)).rejects.toHaveProperty("message")
})

test("editor loads only the four permitted fields and cancel sends no update", async () => {
  const writes = vi.fn()
  server.use(http.put(updateUrl, () => { writes(); return HttpResponse.json(apiSuccess(true)) }))
  const { user } = renderWithProviders(<LeadDetailsPage botId="73" leadId="101" />, { route: detailsRoute })
  const form = await openEditor()
  expect(form.getAllByRole("textbox")).toHaveLength(4)
  expect(form.getByRole("textbox", { name: "Profile name" })).toHaveValue(leadDetailsDto.profileName)
  expect(form.getByRole("textbox", { name: "Profile URL" })).toHaveValue(leadDetailsDto.profileUrl)
  expect(form.getByRole("textbox", { name: "AI message" })).toHaveValue(leadDetailsDto.aiMessage)
  expect(form.getByRole("textbox", { name: "Status" })).toHaveValue("Pending")
  expect(within(screen.getByRole("region", { name: "Additional details" })).queryByRole("textbox")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Remove lead" })).not.toBeInTheDocument()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  await user.clear(form.getByRole("textbox", { name: "Profile name" }))
  await user.type(form.getByRole("textbox", { name: "Profile name" }), "Discarded change")
  await user.click(form.getByRole("button", { name: "Cancel" }))
  expect(screen.getByRole("heading", { name: leadDetailsDto.profileName })).toBeInTheDocument()
  expect(writes).not.toHaveBeenCalled()
})

test("saving refreshes authoritative details, preserves metadata, and invalidates lists and preview", async () => {
  let saved = false
  const reads = vi.fn()
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/Leads/101`, () => {
      reads()
      return HttpResponse.json(apiSuccess({ ...leadDetailsDto, ...(saved ? updated : {}) }))
    }),
    http.put(updateUrl, async ({ request }) => { writes(await request.json()); saved = true; return HttpResponse.json(apiSuccess(true)) }),
  )
  const { user, queryClient } = renderWithProviders(<LeadDetailsPage botId="73" leadId="101" />, { route: detailsRoute })
  const listKey = queryKeys.leads.list({ botId: 73, pageNumber: 1, pageSize: 10 })
  const previewKey = queryKeys.leads.messagingPreview(73)
  queryClient.setQueryData(listKey, { previous: true })
  queryClient.setQueryData(previewKey, { previous: true })
  const form = await openEditor()
  for (const [label, value] of [["Profile name", updated.profileName], ["Profile URL", updated.profileUrl], ["AI message", updated.aiMessage], ["Status", updated.status]]) {
    fireEvent.change(form.getByRole("textbox", { name: label }), { target: { value } })
  }
  await user.click(form.getByRole("button", { name: "Save changes" }))
  expect(await screen.findByText("Lead #101 updated.")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: updated.profileName })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: updated.profileUrl })).toHaveAttribute("href", updated.profileUrl)
  expect(screen.getByRole("region", { name: "AI message" })).toHaveTextContent("Second paragraph.")
  expect(queryClient.getQueryData(queryKeys.leads.detail(73, 101))).toMatchObject({ ...updated, metadataJson: leadDetailsDto.metadataJson })
  expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(previewKey)?.isInvalidated).toBe(true)
  expect(reads).toHaveBeenCalledTimes(2)
  expect(writes).toHaveBeenCalledExactlyOnceWith(updated)
  expect(screen.queryByRole("form", { name: "Edit lead" })).not.toBeInTheDocument()
})

test("failed updates preserve edits and require an explicit retry", async () => {
  let failing = true
  const writes = vi.fn()
  server.use(http.put(updateUrl, () => {
    writes()
    return failing ? HttpResponse.json(apiFailure(409, "This lead cannot be updated yet.", "/api/v1/Leads/UpdateLead/101", "PUT"), { status: 409 }) : HttpResponse.json(apiSuccess(true))
  }))
  const { user } = renderWithProviders(<LeadDetailsPage botId="73" leadId="101" />, { route: detailsRoute })
  const form = await openEditor()
  fireEvent.change(form.getByRole("textbox", { name: "Profile name" }), { target: { value: "Retain my edit" } })
  await user.click(form.getByRole("button", { name: "Save changes" }))
  expect(await form.findByRole("alert")).toHaveTextContent("This lead cannot be updated yet.")
  expect(form.getByRole("textbox", { name: "Profile name" })).toHaveValue("Retain my edit")
  expect(writes).toHaveBeenCalledTimes(1)
  expect(screen.queryByText("Lead #101 updated.")).not.toBeInTheDocument()
  failing = false
  await user.click(form.getByRole("button", { name: "Save changes" }))
  expect(await screen.findByText("Lead #101 updated.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledTimes(2)
})

test("pending saves block duplicate writes, editing, and cancel", async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  const writes = vi.fn()
  server.use(http.put(updateUrl, async () => { writes(); await pending; return HttpResponse.json(apiSuccess(true)) }))
  renderWithProviders(<LeadDetailsPage botId="73" leadId="101" />, { route: detailsRoute })
  const form = await openEditor()
  const submit = form.getByRole("button", { name: "Save changes" })
  fireEvent.click(submit)
  fireEvent.click(submit)
  try {
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1))
    expect(form.getByRole("button", { name: "Saving…" })).toBeDisabled()
    expect(form.getByRole("button", { name: "Cancel" })).toBeDisabled()
    for (const field of form.getAllByRole("textbox")) expect(field).toBeDisabled()
  } finally {
    finish()
  }
  expect(await screen.findByText("Lead #101 updated.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledTimes(1)
})

test("a successful update followed by a failed detail refresh reports the save and allows a read retry", async () => {
  let saved = false
  let failRefresh = true
  const writes = vi.fn()
  server.use(
    http.put(updateUrl, () => { writes(); saved = true; return new HttpResponse(null, { status: 204 }) }),
    http.get(`${apiOrigin}/api/v1/Leads/101`, () => saved && failRefresh
      ? HttpResponse.json(apiFailure(500, "Refresh failed.", "/api/v1/Leads/101"), { status: 500 })
      : HttpResponse.json(apiSuccess({ ...leadDetailsDto, ...(saved ? updated : {}) }))),
  )
  const { user } = renderWithProviders(<LeadDetailsPage botId="73" leadId="101" />, { route: detailsRoute })
  const form = await openEditor()
  await user.click(form.getByRole("button", { name: "Save changes" }))
  expect(await screen.findByText("Lead #101 updated.")).toBeInTheDocument()
  expect(screen.getByText("Unable to load lead details")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled()
  expect(screen.queryByRole("form")).not.toBeInTheDocument()
  failRefresh = false
  await user.click(screen.getByRole("button", { name: "Try again" }))
  expect(await screen.findByRole("heading", { name: updated.profileName })).toBeInTheDocument()
  expect(writes).toHaveBeenCalledTimes(1)
})

function DetailRoute() {
  const { botId, leadId } = useParams()
  return <LeadDetailsPage key={`${botId}:${leadId}`} botId={botId!} leadId={leadId!} />
}

test("a late save response cannot affect another lead's editor", async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  server.use(
    http.put(updateUrl, async () => { await pending; return HttpResponse.json(apiSuccess(true)) }),
    http.get(`${apiOrigin}/api/v1/Leads/102`, () => HttpResponse.json(apiSuccess({ ...leadDetailsDto, id: 102, botId: 74, profileName: "Another recipient" }))),
  )
  const { user, queryClient } = renderWithProviders(<>
    <Link to="/dashboard/bots/74/leads/102">Another workspace</Link>
    <Routes><Route path="/dashboard/bots/:botId/leads/:leadId" element={<DetailRoute />} /></Routes>
  </>, { route: detailsRoute })
  const first = await openEditor()
  fireEvent.click(first.getByRole("button", { name: "Save changes" }))
  await waitFor(() => expect(first.getByRole("button", { name: "Saving…" })).toBeDisabled())
  await user.click(screen.getByRole("link", { name: "Another workspace" }))
  await screen.findByRole("heading", { name: "Another recipient" })
  const second = await openEditor()
  fireEvent.change(second.getByRole("textbox", { name: "Status" }), { target: { value: "Unsaved status" } })
  await act(async () => { finish(); await pending })
  await waitFor(() => expect(queryClient.isMutating()).toBe(0))
  expect(screen.getByRole("heading", { name: "Edit lead #102" })).toBeInTheDocument()
  expect(second.getByRole("textbox", { name: "Status" })).toHaveValue("Unsaved status")
  expect(screen.queryByText("Lead #101 updated.")).not.toBeInTheDocument()
})
