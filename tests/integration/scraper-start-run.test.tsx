import { Suspense } from "react"
import { screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { beforeEach, expect, test, vi } from "vitest"

import { botModulesRegistry } from "@/registry/botModulesRegistry"
import { accountDto, apiFailure, apiOrigin, apiPage, apiSuccess } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

const bots = [
  { code: "FB-MEMBERS-SCRAPER", id: 73, title: "Start Members Scraper", metadata: {} },
  { code: "FB-POSTS-SCRAPER", id: 74, title: "Start Post Scraper", metadata: { searchTerm: "software", maxResults: 100 } },
  { code: "FB-MEMBERS-MESSAGES-SCRAPER", id: 75, title: "Start Members Messages Scraper", metadata: {} },
] as const

const runsPages = Object.fromEntries(Object.entries(botModulesRegistry)
  .map(([code, module]) => [code, module.resolveComponent("runs")!]))

function Runs({ code, id }: { code: string; id: number }) {
  const Page = runsPages[code]!
  return <Suspense fallback={<p>Loading runs…</p>}><Page botId={String(id)} /></Suspense>
}

beforeEach(() => {
  server.use(http.get(`${apiOrigin}/api/v1/scrapes`, () => HttpResponse.json(apiSuccess(apiPage([])))))
})

test.each(bots)("$code opens its own form and sends the current bot ID and only its metadata", async (bot) => {
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/${bot.id}`, () => HttpResponse.json(apiSuccess([accountDto]))),
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      writes(await request.json())
      return HttpResponse.json(apiSuccess(42))
    }),
  )
  const { user } = renderWithProviders(<Runs {...bot} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const dialog = within(await screen.findByRole("dialog", { name: bot.title }))
  const account = dialog.getByLabelText("Connected account")
  await waitFor(() => expect(account).toBeEnabled())
  await user.selectOptions(account, String(accountDto.id))
  if (bot.code === "FB-POSTS-SCRAPER") {
    await user.type(dialog.getByLabelText("Search term"), "software")
    expect(dialog.getByLabelText("Maximum results")).toHaveValue(100)
  } else {
    expect(dialog.queryByLabelText("Search term")).not.toBeInTheDocument()
    expect(dialog.queryByLabelText("Maximum results")).not.toBeInTheDocument()
    expect(dialog.queryByLabelText("Group members count")).not.toBeInTheDocument()
  }
  await user.click(dialog.getByRole("button", { name: "Start run" }))
  expect(await screen.findByText("Run #42 started successfully.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledExactlyOnceWith({
    botId: bot.id, connectedAccountId: accountDto.id, infoJson: JSON.stringify(bot.metadata),
  })
})

test.each(bots)("$code opens without eligible accounts and recovers through Refresh accounts", async (bot) => {
  let ready = false
  const writes = vi.fn()
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/${bot.id}`, () => HttpResponse.json(apiSuccess(ready ? [accountDto] : []))),
    http.post(`${apiOrigin}/api/v1/scrapes`, async ({ request }) => {
      writes(await request.json())
      return HttpResponse.json(apiSuccess(42))
    }),
  )
  const { user } = renderWithProviders(<Runs {...bot} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const dialog = within(await screen.findByRole("dialog", { name: bot.title }))
  expect(await dialog.findByText("No eligible connected accounts are available for this bot.")).toBeInTheDocument()
  expect(dialog.getByRole("button", { name: "Start run" })).toBeDisabled()
  expect(dialog.getByRole("link", { name: "Manage connected accounts" })).toHaveAttribute("href", `/dashboard/bots/${bot.id}/connected-accounts`)
  expect(writes).not.toHaveBeenCalled()
  ready = true
  await user.click(dialog.getByRole("button", { name: "Refresh accounts" }))
  await waitFor(() => expect(dialog.getByLabelText("Connected account")).toBeEnabled())
  await user.selectOptions(dialog.getByLabelText("Connected account"), String(accountDto.id))
  if (bot.code === "FB-POSTS-SCRAPER") await user.type(dialog.getByLabelText("Search term"), "software")
  await user.click(dialog.getByRole("button", { name: "Start run" }))
  expect(await screen.findByText("Run #42 started successfully.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledExactlyOnceWith({ botId: bot.id, connectedAccountId: accountDto.id, infoJson: JSON.stringify(bot.metadata) })
})

test("a configured modal opens while accounts load and stays blocked until they arrive", async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => { finish = resolve })
  server.use(http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/73`, async () => {
    await pending
    return HttpResponse.json(apiSuccess([accountDto]))
  }))
  const { user } = renderWithProviders(<Runs {...bots[0]} />)
  try {
    await user.click(await screen.findByRole("button", { name: "Start run" }))
    const dialog = within(await screen.findByRole("dialog", { name: bots[0].title }))
    expect(dialog.getByRole("button", { name: "Start run" })).toBeDisabled()
    expect(dialog.getByLabelText("Connected account")).toBeDisabled()
    finish()
    await waitFor(() => expect(dialog.getByLabelText("Connected account")).toBeEnabled())
  } finally {
    finish()
  }
})

test("an account read error can be retried inside the modal", async () => {
  let failing = true
  server.use(http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/75`, () => failing
    ? HttpResponse.json(apiFailure(404, "Bot subscription not found.", "/api/v1/connectedaccounts/eligible/75", "GET"), { status: 404 })
    : HttpResponse.json(apiSuccess([accountDto]))))
  const { user } = renderWithProviders(<Runs {...bots[2]} />)
  await user.click(await screen.findByRole("button", { name: "Start run" }))
  const dialog = within(await screen.findByRole("dialog", { name: bots[2].title }))
  expect(await dialog.findByText("Eligible connected accounts could not be loaded.")).toBeInTheDocument()
  expect(dialog.getByRole("button", { name: "Start run" })).toBeDisabled()
  failing = false
  await user.click(dialog.getByRole("button", { name: "Refresh accounts" }))
  await waitFor(() => expect(dialog.getByLabelText("Connected account")).toBeEnabled())
  expect(dialog.getByRole("option", { name: accountDto.displayName })).toBeInTheDocument()
})
