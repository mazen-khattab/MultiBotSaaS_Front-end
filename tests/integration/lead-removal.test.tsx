import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { Link, Route, Routes, useLocation, useParams } from "react-router-dom"
import { expect, test, vi } from "vitest"

import { queryKeys } from "@/core/query/queryKeys"
import LeadDetailsPage from "@/features/leads/pages/LeadDetailsPage"
import LeadsPage from "@/features/leads/pages/LeadsPage"
import MessagingPreviewPage from "@/features/leads/pages/MessagingPreviewPage"
import { LeadsService } from "@/features/leads/services/LeadsService"
import { apiFailure, apiOrigin, apiPage, apiSuccess, leadDetailsDto, leadDto } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

const removeUrl = `${apiOrigin}/api/v1/Leads/RemoveLead/101`
const detailsRoute = "/dashboard/bots/73/leads/101"
const previewDto = { dailyMessageLimit: 10, messagesSent: 0, allowedToProcessCount: 1, leads: [{ leadId: 101, leadNumber: "LED-#101", profileName: leadDto.profileName, profileUrl: leadDto.profileUrl, aiMessage: "List summary", status: "Pending" }] }

function DetailRoute() {
  const { botId, leadId } = useParams()
  return <LeadDetailsPage key={`${botId}:${leadId}`} botId={botId!} leadId={leadId!} />
}

function NavigationHarness() {
  const location = useLocation()
  return <>
    <output aria-label="Current route">{location.pathname}</output>
    <Link to="/dashboard/bots/74/leads/102">Another workspace</Link>
    <Routes>
      <Route path="/dashboard/bots/73/leads" element={<LeadsPage botId="73" />} />
      <Route path="/dashboard/bots/73/messaging-preview" element={<MessagingPreviewPage botId="73" />} />
      <Route path="/dashboard/bots/:botId/leads/:leadId" element={<DetailRoute />} />
    </Routes>
  </>
}

async function openConfirmation() {
  await screen.findByRole("heading", { name: leadDetailsDto.profileName })
  await waitFor(() => expect(screen.getByRole("button", { name: "Remove lead" })).toBeEnabled())
  fireEvent.click(screen.getByRole("button", { name: "Remove lead" }))
  return within(await screen.findByRole("dialog", { name: "Remove lead?" }))
}

test.each(["envelope", "null acknowledgment", "no content"])("remove service uses the exact DELETE path with cookies and accepts %s", async (response) => {
  const writes = vi.fn()
  server.use(http.delete(removeUrl, async ({ request }) => {
    writes()
    expect(request.credentials).toBe("include")
    expect(new URL(request.url).search).toBe("")
    expect(await request.text()).toBe("")
    expect(request.headers.has("Authorization")).toBe(false)
    return response === "no content" ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(apiSuccess(response === "envelope" ? true : null))
  }))
  await expect(LeadsService.removeLead(101)).resolves.toBeUndefined()
  expect(writes).toHaveBeenCalledTimes(1)
})

test.each([0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1])("invalid removal ID %s never reaches HTTP", async (leadId) => {
  const writes = vi.fn()
  server.use(http.delete(`${apiOrigin}/api/v1/Leads/RemoveLead/:leadId`, () => { writes(); return HttpResponse.json(apiSuccess(true)) }))
  await expect(LeadsService.removeLead(leadId)).rejects.toMatchObject({ message: "Select a valid lead before removing it." })
  expect(writes).not.toHaveBeenCalled()
})

test.each([apiSuccess(false), { isSuccess: false, message: "Removal rejected.", errorType: 1, data: null }, { unexpected: true }])("unsuccessful or malformed deletion acknowledgments never report success", async (payload) => {
  server.use(http.delete(removeUrl, () => HttpResponse.json(payload)))
  await expect(LeadsService.removeLead(101)).rejects.toHaveProperty("message")
})

test("opening and cancelling removal sends no DELETE and keeps the detail page", async () => {
  const writes = vi.fn()
  server.use(http.delete(removeUrl, () => { writes(); return HttpResponse.json(apiSuccess(true)) }))
  const { user } = renderWithProviders(<NavigationHarness />, { route: detailsRoute })
  const confirmation = await openConfirmation()
  expect(confirmation.getByRole("button", { name: "Cancel" })).toHaveFocus()
  expect(confirmation.getByText(/Remove lead #101/)).toHaveTextContent(leadDetailsDto.profileName)
  expect(writes).not.toHaveBeenCalled()
  await user.click(confirmation.getByRole("button", { name: "Cancel" }))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(screen.getByLabelText("Current route").textContent).toBe(detailsRoute)
  expect(writes).not.toHaveBeenCalled()
})

test.each(["leads", "messaging-preview"])("confirmed removal refreshes %s, drops every cached copy, and returns with acknowledgment", async (source) => {
  let removed = false
  const writes = vi.fn()
  const reads = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/leads/leads/73`, () => { reads("list"); return HttpResponse.json(apiSuccess(apiPage(removed ? [] : [leadDto]))) }),
    http.get(`${apiOrigin}/api/v1/leads/bot/messaging-preview/73`, () => { reads("preview"); return HttpResponse.json(apiSuccess(removed ? { ...previewDto, allowedToProcessCount: 0, leads: [] } : previewDto)) }),
    http.delete(removeUrl, () => { writes(); removed = true; return HttpResponse.json(apiSuccess(true)) }),
  )
  const { user, queryClient } = renderWithProviders(<NavigationHarness />, { route: `/dashboard/bots/73/${source}` })
  queryClient.setQueryData(queryKeys.leads.detail(74, 101), { ...leadDetailsDto, botId: 74 })
  queryClient.setQueryData(queryKeys.leads.detail(73, 102), { ...leadDetailsDto, id: 102 })
  await user.click(await screen.findByText(leadDto.profileName))
  const confirmation = await openConfirmation()
  await user.click(confirmation.getByRole("button", { name: "Confirm removal" }))
  expect(await screen.findByText("Lead #101 removed.")).toBeInTheDocument()
  expect(screen.getByLabelText("Current route").textContent).toBe(`/dashboard/bots/73/${source}`)
  expect(await screen.findByText(source === "leads" ? "No leads found" : "No available leads")).toBeInTheDocument()
  expect(queryClient.getQueryData(queryKeys.leads.detail(73, 101))).toBeUndefined()
  expect(queryClient.getQueryData(queryKeys.leads.detail(74, 101))).toBeUndefined()
  expect(queryClient.getQueryData(queryKeys.leads.detail(73, 102))).toHaveProperty("id", 102)
  expect(reads.mock.calls.filter(([kind]) => kind === (source === "leads" ? "list" : "preview"))).toHaveLength(2)
  expect(writes).toHaveBeenCalledTimes(1)
})

test("pending removal blocks duplicate requests and dismissal until acknowledged", async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  const writes = vi.fn()
  server.use(http.delete(removeUrl, async () => { writes(); await pending; return HttpResponse.json(apiSuccess(true)) }))
  const { user } = renderWithProviders(<NavigationHarness />, { route: detailsRoute })
  const confirmation = await openConfirmation()
  const confirm = confirmation.getByRole("button", { name: "Confirm removal" })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  try {
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1))
    expect(confirmation.getByRole("button", { name: "Removing…" })).toBeDisabled()
    expect(confirmation.getByRole("button", { name: "Cancel" })).toBeDisabled()
    await user.keyboard("{Escape}")
    expect(screen.getByRole("dialog", { name: "Remove lead?" })).toBeInTheDocument()
    expect(screen.queryByText("Lead #101 removed.")).not.toBeInTheDocument()
  } finally {
    finish()
  }
  expect(await screen.findByText("Lead #101 removed.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledTimes(1)
})

test("failed removal retains details and its confirmation for an explicit retry", async () => {
  let failing = true
  const writes = vi.fn()
  server.use(http.delete(removeUrl, () => {
    writes()
    return failing ? HttpResponse.json(apiFailure(409, "This lead cannot be removed yet.", "/api/v1/Leads/RemoveLead/101", "DELETE"), { status: 409 }) : HttpResponse.json(apiSuccess(true))
  }))
  const { user, queryClient } = renderWithProviders(<NavigationHarness />, { route: detailsRoute })
  const confirmation = await openConfirmation()
  await user.click(confirmation.getByRole("button", { name: "Confirm removal" }))
  expect(await confirmation.findByRole("alert")).toHaveTextContent("This lead cannot be removed yet.")
  expect(screen.getByLabelText("Current route").textContent).toBe(detailsRoute)
  expect(queryClient.getQueryData(queryKeys.leads.detail(73, 101))).toHaveProperty("id", 101)
  expect(screen.queryByText("Lead #101 removed.")).not.toBeInTheDocument()
  expect(writes).toHaveBeenCalledTimes(1)
  failing = false
  await user.click(confirmation.getByRole("button", { name: "Confirm removal" }))
  expect(await screen.findByText("Lead #101 removed.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledTimes(2)
})

test("a late removal response cannot redirect another workspace", async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  server.use(
    http.delete(removeUrl, async () => { await pending; return HttpResponse.json(apiSuccess(true)) }),
    http.get(`${apiOrigin}/api/v1/Leads/102`, () => HttpResponse.json(apiSuccess({ ...leadDetailsDto, id: 102, botId: 74, profileName: "Another recipient" }))),
  )
  const view = renderWithProviders(<NavigationHarness />, { route: detailsRoute })
  const confirmation = await openConfirmation()
  fireEvent.click(confirmation.getByRole("button", { name: "Confirm removal" }))
  await waitFor(() => expect(confirmation.getByRole("button", { name: "Removing…" })).toBeDisabled())
  // Simulate navigation through the router while the original page is abandoned.
  const outsideLink = screen.getByRole("link", { name: "Another workspace", hidden: true })
  fireEvent.click(outsideLink)
  expect(await screen.findByRole("heading", { name: "Another recipient" })).toBeInTheDocument()
  await act(async () => { finish(); await pending })
  await waitFor(() => expect(view.queryClient.isMutating()).toBe(0))
  expect(screen.getByLabelText("Current route").textContent).toBe("/dashboard/bots/74/leads/102")
  expect(screen.queryByText("Lead #101 removed.")).not.toBeInTheDocument()
})
