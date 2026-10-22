import { useLocation } from "react-router-dom"
import { Suspense } from "react"
import { act, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { beforeEach, expect, test, vi } from "vitest"

import { botModulesRegistry } from "@/registry/botModulesRegistry"
import { queryKeys } from "@/core/query/queryKeys"
import { accountDto, apiFailure, apiOrigin, apiPage, apiSuccess } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

const bots = [
  { code: "FB-MEMBERS-SCRAPER", id: 73, title: "Start Members Scraper", metadata: {} },
  { code: "FB-POSTS-SCRAPER", id: 74, title: "Start Post Scraper", metadata: {
    searchTerm: "software", postsCount: 10, postDescription: "", analyzieCommentPrompt: "", analyzieProfilePrompt: "", aiMessageStructure: "",
  } },
  { code: "FB-MEMBERS-MESSAGES-SCRAPER", id: 75, title: "Start Members Messages Scraper", metadata: {} },
] as const

const runsPages = Object.fromEntries(Object.entries(botModulesRegistry)
  .map(([code, module]) => [code, module.resolveComponent("runs")!]))

function Runs({ code, id }: { code: string; id: number }) {
  const Page = runsPages[code]!
  const location = useLocation()
  return <Suspense fallback={<p>Loading runs…</p>}><Page botId={String(id)} view={location.pathname.endsWith("/runs/start") ? "start-run" : undefined} /></Suspense>
}

beforeEach(() => {
  server.use(
    http.get(`${apiOrigin}/api/v1/scrapes`, () => HttpResponse.json(apiSuccess(apiPage([])))),
    http.get(`${apiOrigin}/api/v1/TargetGroups/:botId`, ({ params, request }) => {
      expect(request.credentials).toBe("include")
      expect(new URL(request.url).search).toBe("")
      return HttpResponse.json(apiSuccess([{ id: Number(params.botId) + 100,
        groupName: `Group for bot ${params.botId}`, groupUrl: "https://example.test/group", isActive: true }]))
    }),
  )
})

test.each(bots)("$code opens its own form and sends the current bot ID and only its metadata", async (bot) => {
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/${bot.id}`, () => HttpResponse.json(apiSuccess([accountDto]))),
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      writes(await request.json())
      return HttpResponse.json(apiSuccess(42))
    }),
  )
  const { user } = renderWithProviders(<Runs {...bot} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }, { timeout: 5000 }))
  const runPage = within(await screen.findByRole("region", { name: bot.title }))
  const account = runPage.getByLabelText("Connected account")
  await waitFor(() => expect(account).toBeEnabled())
  await user.selectOptions(account, String(accountDto.id))
  await user.selectOptions(runPage.getByLabelText("Target group"), String(bot.id + 100))
  if (bot.code === "FB-POSTS-SCRAPER") {
    await user.type(runPage.getByLabelText("Search term"), "software")
    expect(runPage.getByLabelText("Posts count")).toHaveValue(10)
  } else {
    expect(runPage.queryByLabelText("Search term")).not.toBeInTheDocument()
    expect(runPage.queryByLabelText("Posts count")).not.toBeInTheDocument()
    expect(runPage.queryByLabelText("Post description")).not.toBeInTheDocument()
    expect(runPage.queryByLabelText("Analyze comment prompt")).not.toBeInTheDocument()
    expect(runPage.queryByLabelText("Analyze profile posts prompt")).not.toBeInTheDocument()
    expect(runPage.queryByLabelText("Group members count")).not.toBeInTheDocument()
  }
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await screen.findByText("Run #42 started successfully.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledExactlyOnceWith({
    botId: bot.id, connectedAccountId: accountDto.id, targetGroupId: bot.id + 100, infoJson: JSON.stringify(bot.metadata),
  })
})

test.each(bots)("$code opens without eligible accounts and recovers through Refresh accounts", async (bot) => {
  let ready = false
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/${bot.id}`, () => HttpResponse.json(apiSuccess(ready ? [accountDto] : []))),
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      writes(await request.json())
      return HttpResponse.json(apiSuccess(42))
    }),
  )
  const { user } = renderWithProviders(<Runs {...bot} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const runPage = within(await screen.findByRole("region", { name: bot.title }))
  expect(await runPage.findByText("No eligible connected accounts are available for this bot.")).toBeInTheDocument()
  expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled()
  expect(runPage.getByRole("link", { name: "Manage connected accounts" })).toHaveAttribute("href", `/dashboard/bots/${bot.id}/connected-accounts`)
  expect(writes).not.toHaveBeenCalled()
  ready = true
  await user.click(runPage.getByRole("button", { name: "Refresh accounts" }))
  await waitFor(() => expect(runPage.getByLabelText("Connected account")).toBeEnabled())
  await user.selectOptions(runPage.getByLabelText("Connected account"), String(accountDto.id))
  await user.selectOptions(runPage.getByLabelText("Target group"), String(bot.id + 100))
  if (bot.code === "FB-POSTS-SCRAPER") await user.type(runPage.getByLabelText("Search term"), "software")
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await screen.findByText("Run #42 started successfully.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledExactlyOnceWith({ botId: bot.id, connectedAccountId: accountDto.id, targetGroupId: bot.id + 100, infoJson: JSON.stringify(bot.metadata) })
})

test("a configured page opens while accounts load and stays blocked until they arrive", async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  server.use(http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/73`, async () => {
    await pending
    return HttpResponse.json(apiSuccess([accountDto]))
  }))
  const { user } = renderWithProviders(<Runs {...bots[0]} />)
  try {
    await user.click(await screen.findByRole("button", { name: "Start run" }))
    const runPage = within(await screen.findByRole("region", { name: bots[0].title }))
    expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled()
    expect(runPage.getByLabelText("Connected account")).toBeDisabled()
    finish()
    await waitFor(() => expect(runPage.getByLabelText("Connected account")).toBeEnabled())
  } finally {
    finish()
  }
})

test("an account read error can be retried inside the page", async () => {
  let failing = true
  server.use(http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/75`, () => failing
    ? HttpResponse.json(apiFailure(404, "Bot subscription not found.", "/api/v1/connectedaccounts/eligible/scraping/75", "GET"), { status: 404 })
    : HttpResponse.json(apiSuccess([accountDto]))))
  const { user } = renderWithProviders(<Runs {...bots[2]} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const runPage = within(await screen.findByRole("region", { name: bots[2].title }))
  expect(await runPage.findByText("Eligible connected accounts could not be loaded.")).toBeInTheDocument()
  expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled()
  failing = false
  await user.click(runPage.getByRole("button", { name: "Refresh accounts" }))
  await waitFor(() => expect(runPage.getByLabelText("Connected account")).toBeEnabled())
  expect(runPage.getByRole("option", { name: accountDto.displayName })).toBeInTheDocument()
})

test.each(bots)("$code requires a group before creating a run", async (bot) => {
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/${bot.id}`, () => HttpResponse.json(apiSuccess([accountDto]))),
    http.post(`${apiOrigin}/api/v1/scrapes`, () => { writes(); return HttpResponse.json(apiSuccess(42)) }),
  )
  const { user } = renderWithProviders(<Runs {...bot} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const runPage = within(await screen.findByRole("region", { name: bot.title }))
  await waitFor(() => expect(runPage.getByLabelText("Connected account")).toBeEnabled())
  await user.selectOptions(runPage.getByLabelText("Connected account"), "12")
  if (bot.code === "FB-POSTS-SCRAPER") await user.type(runPage.getByLabelText("Search term"), "software")
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await runPage.findByText("Choose a target group.")).toBeInTheDocument()
  expect(writes).not.toHaveBeenCalled()
})

test.each(["empty", "inactive"])("an %s group list blocks submission and can be refreshed after managing groups", async (state) => {
  let ready = false
  server.use(http.get(`${apiOrigin}/api/v1/TargetGroups/73`, () => HttpResponse.json(apiSuccess(ready
    ? [{ id: 5, groupName: "Available group", groupUrl: "https://example.test/group", isActive: true }]
    : state === "empty" ? [] : [{ id: 6, groupName: "Paused group", groupUrl: "https://example.test/group", isActive: false }]))))
  const { user } = renderWithProviders(<Runs {...bots[0]} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const runPage = within(await screen.findByRole("region", { name: bots[0].title }))
  expect(await runPage.findByText(/No active target groups are available/)).toBeInTheDocument()
  expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled()
  expect(runPage.getByRole("link", { name: "Manage target groups" })).toHaveAttribute("href", "/dashboard/bots/73/groups")
  if (state === "inactive") expect(runPage.getByRole("option", { name: "Paused group (Inactive)" })).toBeDisabled()
  ready = true
  await user.click(runPage.getByRole("button", { name: "Refresh groups" }))
  await waitFor(() => expect(runPage.getByLabelText("Target group")).toBeEnabled())
  expect(runPage.getByRole("option", { name: "Available group" })).toBeEnabled()
})

test("group loading keeps the configured page accessible while preventing submission", async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  server.use(http.get(`${apiOrigin}/api/v1/TargetGroups/73`, async () => {
    await pending
    return HttpResponse.json(apiSuccess([{ id: 5, groupName: "Available group", groupUrl: "https://example.test/group", isActive: true }]))
  }))
  const { user } = renderWithProviders(<Runs {...bots[0]} />)
  try {
    await user.click(await screen.findByRole("button", { name: "Start run" }))
    const runPage = within(await screen.findByRole("region", { name: bots[0].title }))
    expect(runPage.getByText("Loading target groups…")).toBeInTheDocument()
    expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled()
    finish()
    await waitFor(() => expect(runPage.getByLabelText("Target group")).toBeEnabled())
  } finally {
    finish()
  }
})

test("group errors can be retried without losing entered run settings", async () => {
  let failing = false
  server.use(http.get(`${apiOrigin}/api/v1/TargetGroups/73`, () => failing
    ? HttpResponse.json(apiFailure(404, "Groups unavailable.", "/api/v1/TargetGroups/73"), { status: 404 })
    : HttpResponse.json(apiSuccess([{ id: 5, groupName: "Available group", groupUrl: "https://example.test/group", isActive: true }]))))
  const { user, queryClient } = renderWithProviders(<Runs {...bots[1]} id={73} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const runPage = within(await screen.findByRole("region", { name: bots[1].title }))
  await waitFor(() => expect(runPage.getByLabelText("Target group")).toBeEnabled())
  await user.selectOptions(runPage.getByLabelText("Target group"), "5")
  await user.type(runPage.getByLabelText("Search term"), "software")
  failing = true
  await act(async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.groups.list({ botId: 73 }) }) })
  expect(await runPage.findByText("Target groups could not be loaded. Please try again.")).toBeInTheDocument()
  expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled()
  failing = false
  await user.click(runPage.getByRole("button", { name: "Refresh groups" }))
  await waitFor(() => expect(runPage.getByLabelText("Target group")).toBeEnabled())
  expect(runPage.getByLabelText("Target group")).toHaveValue("5")
  expect(runPage.getByLabelText("Search term")).toHaveValue("software")
})

test("a selected group that becomes inactive cannot be submitted", async () => {
  let active = true
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/TargetGroups/73`, () => HttpResponse.json(apiSuccess([
      { id: 5, groupName: "First group", groupUrl: "https://example.test/first", isActive: active },
      { id: 6, groupName: "Second group", groupUrl: "https://example.test/second", isActive: true },
    ]))),
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      writes(await request.json())
      return HttpResponse.json(apiSuccess(42))
    }),
  )
  const { user, queryClient } = renderWithProviders(<Runs {...bots[0]} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const runPage = within(await screen.findByRole("region", { name: bots[0].title }))
  await waitFor(() => expect(runPage.getByLabelText("Target group")).toBeEnabled())
  await user.selectOptions(runPage.getByLabelText("Connected account"), "12")
  await user.selectOptions(runPage.getByLabelText("Target group"), "5")
  active = false
  await act(async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.groups.list({ botId: 73 }) }) })
  await waitFor(() => expect(runPage.getByRole("option", { name: "First group (Inactive)" })).toBeDisabled())
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await runPage.findByText("Choose an available option.")).toBeInTheDocument()
  expect(writes).not.toHaveBeenCalled()
  await user.selectOptions(runPage.getByLabelText("Target group"), "6")
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await screen.findByText("Run #42 started successfully.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledExactlyOnceWith({ botId: 73, connectedAccountId: 12, targetGroupId: 6, infoJson: "{}" })
})

test("changing bots closes the old form and never shows another bot's group options", async () => {
  server.use(http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/75`, () => HttpResponse.json(apiSuccess([accountDto]))))
  const { user, rerender } = renderWithProviders(<Runs {...bots[0]} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const firstDialog = within(await screen.findByRole("region", { name: bots[0].title }))
  await waitFor(() => expect(firstDialog.getByLabelText("Target group")).toBeEnabled())
  await user.selectOptions(firstDialog.getByLabelText("Target group"), "173")
  rerender(<Runs {...bots[2]} />)
  await waitFor(() => expect(screen.queryByRole("region", { name: bots[0].title })).not.toBeInTheDocument())
  const secondDialog = within(await screen.findByRole("region", { name: bots[2].title }))
  await waitFor(() => expect(secondDialog.getByLabelText("Target group")).toBeEnabled())
  expect(secondDialog.getByLabelText("Target group")).toHaveValue("")
  expect(secondDialog.getByRole("option", { name: "Group for bot 75" })).toBeInTheDocument()
  expect(secondDialog.queryByRole("option", { name: "Group for bot 73" })).not.toBeInTheDocument()
})
