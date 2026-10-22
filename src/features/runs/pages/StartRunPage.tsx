import type { FieldValues } from "react-hook-form"
import { useNavigate } from "react-router-dom"

import { buildBotTabPath } from "@/app/router/routePaths"
import { StartRunForm } from "@/features/runs/components/StartRunForm"
import { useEligibleAccounts } from "@/features/runs/hooks/useEligibleAccounts"
import type { GenericRunsPageProps } from "./GenericRunsPage"
import { Button } from "@/shared/ui/button"

/** Direct visits get fresh account options and the module's existing form config. */
export default function StartRunPage<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  botId, config, options, startDisabledReason, startFormDisabled, startFormNotice,
}: GenericRunsPageProps<TInput, TOutput>) {
  const navigate = useNavigate()
  const canStart = config.capabilities.canCreateRun && config.startRun !== undefined
  const configurationUnavailableReason = startDisabledReason ?? config.startUnavailableReason
  const eligible = useEligibleAccounts(Number(botId), canStart && !configurationUnavailableReason)
  const accountReadPending = eligible.isPending || eligible.isFetching
  const unavailableReason = accountReadPending
    ? "Loading eligible connected accounts…"
    : eligible.isError
      ? "Eligible connected accounts could not be loaded."
      : eligible.data?.length === 0
        ? "No eligible connected accounts are available for this bot."
        : undefined
  const backToRuns = () => navigate(buildBotTabPath(botId, "runs"))

  if (!canStart || !config.startRun || configurationUnavailableReason) {
    return <section aria-label="Start run" className="space-y-5">
      <h3 className="text-xl font-semibold">Run creation unavailable</h3>
      <p className="text-sm text-muted-foreground">{configurationUnavailableReason ?? "Run creation is unavailable for this bot."}</p>
      <Button type="button" variant="outline" onClick={backToRuns}>Back to runs</Button>
    </section>
  }

  return <StartRunForm
    botId={botId} config={config.startRun}
    options={{ ...options, [config.startRun.accountOptionsProvider]: {
      items: (eligible.data ?? []).map((account) => ({ value: String(account.id), label: account.displayName })),
      isLoading: accountReadPending,
      error: eligible.isError ? "Unable to load eligible accounts." : undefined,
      onRetry: () => { void eligible.refetch() },
    } }}
    eligibleAccounts={eligible.data ?? []}
    disabled={Boolean(unavailableReason) || startFormDisabled}
    unavailableReason={unavailableReason} notice={startFormNotice}
    onRefreshAccounts={() => { void eligible.refetch() }} refreshingAccounts={eligible.isFetching}
    onCancel={backToRuns}
    onCreated={(runId) => navigate(buildBotTabPath(botId, "runs"), {
      replace: true, state: { startedRun: { botId, runId } },
    })}
  />
}
