import { render, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { Route, Routes, useLocation, useParams } from "react-router-dom"
import { expect, test, vi } from "vitest"

import { queryKeys } from "@/core/query/queryKeys"
import { LeadMetadata } from "@/features/leads/components/LeadMetadata"
import LeadDetailsPage from "@/features/leads/pages/LeadDetailsPage"
import LeadsPage from "@/features/leads/pages/LeadsPage"
import MessagingPreviewPage from "@/features/leads/pages/MessagingPreviewPage"
import { LeadsService } from "@/features/leads/services/LeadsService"
import { apiFailure, apiOrigin, apiSuccess, leadDetailsDto, leadDto } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

const detailsUrl = `${apiOrigin}/api/v1/Leads/101`
const directRoute = "/dashboard/bots/73/leads/101"
const renderDetails = (leadId = "101") => renderWithProviders(<LeadDetailsPage botId="73" leadId={leadId} />, { route: `/dashboard/bots/73/leads/${leadId}` })

test("direct visits fetch the authoritative detail DTO with all fixed fields and multiline Arabic text", async () => {
  const reads = vi.fn()
  server.use(http.get(detailsUrl, ({ request }) => {
    reads(request)
    expect(request.credentials).toBe("include")
    expect(new URL(request.url).search).toBe("")
    expect(request.headers.has("Authorization")).toBe(false)
    return HttpResponse.json(apiSuccess({ ...leadDetailsDto, internalField: "Must not display" }))
  }))
  const { queryClient } = renderDetails()
  expect(screen.getByRole("status", { name: "Loading lead details" })).toBeInTheDocument()
  expect(await screen.findByRole("heading", { name: leadDetailsDto.profileName })).toBeInTheDocument()
  const record = screen.getByRole("region", { name: "Record details" })
  for (const label of ["Lead ID", "Bot ID", "Group ID", "Account ID", "Scrape ID", "External ID", "Status", "Created", "Processed"]) {
    expect(within(record).getByText(label)).toBeInTheDocument()
  }
  expect(within(record).getByText("Not processed")).toBeInTheDocument()
  expect(within(record).getByText(leadDetailsDto.externalId)).toBeInTheDocument()
  expect(record.querySelector('time')?.dateTime).toBe(leadDetailsDto.createdAt)
  expect(screen.getByRole("link", { name: leadDetailsDto.profileUrl })).toHaveAttribute("href", leadDetailsDto.profileUrl)
  const message = screen.getByRole("region", { name: "AI message" }).querySelector("p")!
  expect(message.textContent).toBe(leadDetailsDto.aiMessage)
  expect(message).toHaveAttribute("dir", "auto")
  expect(screen.getByTitle("postText").nextElementSibling?.textContent).toContain("135")
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(screen.queryByText("Must not display")).not.toBeInTheDocument()
  expect(reads).toHaveBeenCalledTimes(1)
  expect(queryClient.getQueryData(queryKeys.leads.detail(73, 101))).not.toHaveProperty("internalField")
})

test("metadata fields may be renamed, added, nested, zero, false, or null without a schema change", () => {
  render(<LeadMetadata metadataJson={JSON.stringify({ relativePosts: 0, isRealClient: false, newField: "New information", optionalValue: null, tags: ["buyer", "seller"], analysis: { score: 0, accepted: true } })} />)
  expect(screen.getByTitle("relativePosts")).toHaveTextContent("Relative Posts")
  expect(screen.queryByTitle("realEstatePosts")).not.toBeInTheDocument()
  expect(screen.getByText("New information")).toBeInTheDocument()
  expect(screen.getAllByText("0")).toHaveLength(2)
  expect(screen.getByText("No")).toBeInTheDocument()
  expect(screen.getByText("Yes")).toBeInTheDocument()
  expect(screen.getByText("Not provided")).toBeInTheDocument()
  expect(screen.getByText("buyer")).toBeInTheDocument()
  expect(screen.getByText("Analysis")).toBeInTheDocument()
})

test.each([null, "", "{}", "[]", "not valid JSON"])("missing or malformed metadata %j preserves readable record details", async (metadataJson) => {
  server.use(http.get(detailsUrl, () => HttpResponse.json(apiSuccess({ ...leadDetailsDto, metadataJson }))))
  renderDetails()
  expect(await screen.findByRole("heading", { name: leadDetailsDto.profileName })).toBeInTheDocument()
  expect(screen.getByRole("region", { name: "AI message" })).toHaveTextContent("مرحبًا!")
  if (metadataJson === "not valid JSON") expect(screen.getByText(metadataJson)).toBeInTheDocument()
  else expect(screen.getByRole("region", { name: "Additional details" })).toHaveTextContent(/No (additional details|items)/)
})

test("metadata markup and unsafe profile URLs remain plain text", async () => {
  const markup = '<img src=x onerror="alert(1)">'
  server.use(http.get(detailsUrl, () => HttpResponse.json(apiSuccess({ ...leadDetailsDto, profileUrl: "javascript:alert(1)", metadataJson: JSON.stringify({ commentText: markup, constructor: "A supplied key" }) }))))
  renderDetails()
  expect(await screen.findByText(markup)).toBeInTheDocument()
  expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument()
  expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).not.toBeInTheDocument()
  expect(document.querySelector("img")).toBeNull()
  expect(screen.getByText("A supplied key")).toBeInTheDocument()
})

test("a failed detail read supports explicit retry without showing stale or internal data", async () => {
  let failing = true
  const reads = vi.fn()
  server.use(http.get(detailsUrl, () => {
    reads()
    return failing ? HttpResponse.json(apiFailure(404, "Lead unavailable.", "/api/v1/Leads/101"), { status: 404 }) : HttpResponse.json(apiSuccess(leadDetailsDto))
  }))
  const { user } = renderDetails()
  expect(await screen.findByRole("alert")).toHaveTextContent("Lead unavailable.")
  expect(screen.queryByRole("region", { name: "Record details" })).not.toBeInTheDocument()
  failing = false
  await user.click(screen.getByRole("button", { name: "Try again" }))
  expect(await screen.findByRole("heading", { name: leadDetailsDto.profileName })).toBeInTheDocument()
  expect(reads).toHaveBeenCalledTimes(2)
})

test.each([
  [{ ...leadDetailsDto, id: 102 }, "The server returned a different lead."],
  [{ ...leadDetailsDto, botId: 74 }, "This lead does not belong to the current bot workspace."],
] as const)("mismatched details never render or enter the current workspace cache", async (payload, message) => {
  server.use(http.get(detailsUrl, () => HttpResponse.json(apiSuccess(payload))))
  const { queryClient } = renderDetails()
  expect(await screen.findByRole("alert")).toHaveTextContent(message)
  expect(screen.queryByText(leadDetailsDto.profileName)).not.toBeInTheDocument()
  expect(queryClient.getQueryData(queryKeys.leads.detail(73, 101))).toBeUndefined()
})

test.each(["0", "-1", "invalid", "1e2", "9007199254740992"])("invalid route ID %s never sends a detail request", async (leadId) => {
  const read = vi.spyOn(LeadsService, "getLead")
  renderDetails(leadId)
  expect(screen.getByRole("alert")).toHaveTextContent("Select a valid lead")
  expect(read).not.toHaveBeenCalled()
})

function DetailRoute() {
  const { botId, leadId } = useParams()
  return <LeadDetailsPage botId={botId!} leadId={leadId!} />
}

function NavigationHarness() {
  const location = useLocation()
  return <>
    <output aria-label="Current route">{location.pathname}</output>
    <Routes>
      <Route path="/dashboard/bots/73/leads" element={<LeadsPage botId="73" />} />
      <Route path="/dashboard/bots/73/messaging-preview" element={<MessagingPreviewPage botId="73" />} />
      <Route path="/dashboard/bots/:botId/leads/:leadId" element={<DetailRoute />} />
    </Routes>
  </>
}

test.each(["leads", "messaging-preview"])("row selection from %s navigates to details and returns to its originating page", async (source) => {
  server.use(http.get(`${apiOrigin}/api/v1/leads/bot/messaging-preview/73`, () => HttpResponse.json(apiSuccess({ dailyMessageLimit: 10, messagesSent: 0, allowedToProcessCount: 1, leads: [{ leadId: 101, leadNumber: "LED-#101", profileName: leadDto.profileName, profileUrl: leadDto.profileUrl, aiMessage: "List summary", status: "Pending" }] }))))
  const { user } = renderWithProviders(<NavigationHarness />, { route: `/dashboard/bots/73/${source}` })
  await user.click(await screen.findByText(leadDto.profileName))
  await waitFor(() => expect(screen.getByLabelText("Current route")).toHaveTextContent(directRoute))
  expect(await screen.findByRole("heading", { name: leadDetailsDto.profileName })).toBeInTheDocument()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  await user.click(screen.getByRole("link", { name: source === "leads" ? "Back to leads" : "Back to available leads" }))
  expect(await screen.findByText(leadDto.profileName)).toBeInTheDocument()
  expect(screen.getByLabelText("Current route").textContent).toBe(`/dashboard/bots/73/${source}`)
})
