import { useLocation } from "react-router-dom"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { expect, test, vi } from "vitest"
import { z } from "zod"

import { queryKeys } from "@/core/query/queryKeys"
import GenericRunsPage from "@/features/runs/pages/GenericRunsPage"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import { accountDto, apiFailure, apiOrigin, apiSuccess } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/renderWithProviders"

const schema = z.object({ account: z.string().min(1), term: z.string().min(1) })
const config = {
  title: "Eligibility test runs",
  capabilities: { canCreateRun: true, canListRuns: false, canGetRun: false, canCancelRun: false, canRetryRun: false },
  table: { caption: "Runs", columns: [] },
  startRun: {
    accountOptionsProvider: "accounts",
    form: {
      schema,
      defaultValues: { account: "12", term: "Retained settings" },
      fields: [
        { name: "account", type: "select", label: "Account", optionsProvider: "accounts" },
        { name: "term", type: "text", label: "Search term" },
      ],
    },
    resolveSelection: (values) => ({ connectedAccountId: Number(values.account) }),
    serializeInfoJson: (values) => JSON.stringify({ term: values.term }),
  },
} satisfies RunsPageConfig<z.infer<typeof schema>>

const eligibilityUrl = `${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/73`
const accountKey = queryKeys.accounts.list({ botId: 73, eligible: true, type: "Scraping" })

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

function Runs({ configuration = config }: { configuration?: RunsPageConfig<z.infer<typeof schema>> }) {
  const location = useLocation()
  return <GenericRunsPage botId="73" config={configuration} view={location.pathname.endsWith("/runs/start") ? "start-run" : undefined} />
}

async function openForm(configuration: RunsPageConfig<z.infer<typeof schema>> = config) {
  const view = renderWithProviders(<Runs configuration={configuration} />)
  await view.user.click(screen.getByRole("button", { name: "Start run" }))
  const runPage = within(await screen.findByRole("region", { name: "Start run" }))
  await waitFor(() => expect(runPage.getByLabelText("Account")).toBeEnabled())
  return { ...view, runPage }
}

test("every opening refreshes cached scraping accounts and blocks submission until it finishes", async () => {
  const writes = vi.fn()
  server.use(http.post(`${apiOrigin}/api/v1/scrapes`, () => { writes(); return HttpResponse.json(apiSuccess(42)) }))
  const view = renderWithProviders(<Runs />)
  view.queryClient.setQueryData(accountKey, [accountDto])
  const reads = vi.fn()
  for (const available of [true, false]) {
    const pending = deferred()
    server.use(http.get(eligibilityUrl, async () => {
      reads()
      await pending.promise
      return HttpResponse.json(apiSuccess(available ? [accountDto] : []))
    }))
    try {
      await view.user.click(screen.getByRole("button", { name: "Start run" }))
      const runPage = within(await screen.findByRole("region", { name: "Start run" }))
      expect(runPage.getByRole("button", { name: "Start run" })).toBeDisabled()
      expect(runPage.getByLabelText("Account")).toBeDisabled()
      fireEvent.submit(runPage.getByRole("form"))
      expect(writes).not.toHaveBeenCalled()
      pending.resolve()
      await waitFor(() => expect(view.queryClient.getQueryState(accountKey)?.fetchStatus).toBe("idle"))
      if (available) {
        await waitFor(() => expect(runPage.getByLabelText("Account")).toBeEnabled())
      } else {
        expect(await runPage.findByText("No eligible connected accounts are available for this bot.")).toBeInTheDocument()
        expect(runPage.queryByRole("option", { name: accountDto.displayName })).not.toBeInTheDocument()
      }
      await view.user.click(runPage.getByRole("button", { name: "Cancel" }))
    } finally {
      pending.resolve()
    }
  }
  expect(reads).toHaveBeenCalledTimes(2)
  expect(writes).not.toHaveBeenCalled()
})

test("submission refetches eligibility and refuses an account that expired while the form was open", async () => {
  const writes = vi.fn()
  server.use(http.post(`${apiOrigin}/api/v1/scrapes`, () => { writes(); return HttpResponse.json(apiSuccess(42)) }))
  const { user, runPage } = await openForm()
  const checks = vi.fn()
  server.use(http.get(eligibilityUrl, () => { checks(); return HttpResponse.json(apiSuccess([])) }))
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await runPage.findByText(/This account is no longer eligible/)).toBeInTheDocument()
  expect(runPage.getByLabelText("Search term")).toHaveValue("Retained settings")
  expect(checks).toHaveBeenCalledTimes(1)
  expect(writes).not.toHaveBeenCalled()
  expect(screen.queryByText("Run #42 started successfully.")).not.toBeInTheDocument()
})

test("a failed submission-time eligibility check prevents POST and can be refreshed and retried", async () => {
  const writes = vi.fn()
  server.use(http.post(`${apiOrigin}/api/v1/scrapes`, () => { writes(); return HttpResponse.json(apiSuccess(42)) }))
  const { user, runPage } = await openForm()
  server.use(http.get(eligibilityUrl, () => HttpResponse.json(
    apiFailure(404, "Accounts unavailable.", "/api/v1/connectedaccounts/eligible/scraping/73"), { status: 404 },
  )))
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await runPage.findByText(/Run was not started.*Accounts unavailable/)).toBeInTheDocument()
  expect(writes).not.toHaveBeenCalled()
  server.use(http.get(eligibilityUrl, () => HttpResponse.json(apiSuccess([accountDto]))))
  await user.click(runPage.getByRole("button", { name: "Refresh accounts" }))
  await waitFor(() => expect(runPage.getByRole("button", { name: "Start run" })).toBeEnabled())
  expect(runPage.getByLabelText("Search term")).toHaveValue("Retained settings")
  await user.click(runPage.getByRole("button", { name: "Start run" }))
  expect(await screen.findByText("Run #42 started successfully.")).toBeInTheDocument()
  expect(writes).toHaveBeenCalledTimes(1)
})

test.each(["invalidated", "refreshing"])("submission refuses a query that becomes %s during asynchronous selection preparation", async (state) => {
  const preparing = deferred()
  const refreshing = deferred()
  const started = vi.fn()
  const writes = vi.fn()
  server.use(http.post(`${apiOrigin}/api/v1/scrapes`, () => { writes(); return HttpResponse.json(apiSuccess(42)) }))
  const view = await openForm({ ...config, startRun: {
    ...config.startRun,
    resolveSelection: async () => { started(); await preparing.promise; return { connectedAccountId: 12 } },
  } })
  try {
    await view.user.click(view.runPage.getByRole("button", { name: "Start run" }))
    expect(started).toHaveBeenCalledTimes(1)
    if (state === "refreshing") {
      server.use(http.get(eligibilityUrl, async () => {
        await refreshing.promise
        return HttpResponse.json(apiSuccess([accountDto]))
      }))
    }
    let refresh!: Promise<void>
    act(() => {
      refresh = view.queryClient.invalidateQueries({ queryKey: accountKey, refetchType: state === "refreshing" ? "active" : "none" })
    })
    await act(async () => { preparing.resolve(); await preparing.promise })
    expect(await view.runPage.findByText(/Wait for eligible accounts to finish refreshing/)).toBeInTheDocument()
    expect(writes).not.toHaveBeenCalled()
    await act(async () => { refreshing.resolve(); await refresh })
  } finally {
    preparing.resolve()
    refreshing.resolve()
  }
})

