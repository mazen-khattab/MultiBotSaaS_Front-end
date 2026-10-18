import type { FieldValues } from "react-hook-form"
import { Link } from "react-router-dom"

import { buildBotTabPath } from "@/app/router/routePaths"
import { useGroups } from "@/features/groups/hooks/useGroups"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import { Button } from "@/shared/ui/button"
import GenericRunsPage from "./GenericRunsPage"

interface GroupRunsPageProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  readonly botId: string
  readonly config: RunsPageConfig<TInput, TOutput>
  readonly groupOptionsProvider: string
}

/** Keep group reads outside the generic renderer and scoped to this workspace. */
export default function GroupRunsPage<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  botId, config, groupOptionsProvider,
}: GroupRunsPageProps<TInput, TOutput>) {
  const groups = useGroups(Number(botId))
  const hasActiveGroups = groups.data?.some((group) => group.isActive) ?? false
  const unavailableReason = groups.isPending
    ? "Loading target groups…"
    : groups.isError
      ? "Target groups could not be loaded. Please try again."
      : !hasActiveGroups
        ? "No active target groups are available for this bot. Add or activate a group in Target groups."
        : undefined

  return <GenericRunsPage<TInput, TOutput>
    key={botId}
    botId={botId}
    config={config}
    options={{
      [groupOptionsProvider]: {
        items: (groups.data ?? []).map((group) => ({
          value: String(group.id),
          label: group.isActive ? group.groupName : `${group.groupName} (Inactive)`,
          disabled: !group.isActive,
        })),
        isLoading: groups.isPending,
        error: groups.isError ? "Unable to load target groups." : undefined,
      },
    }}
    startFormDisabled={Boolean(unavailableReason)}
    startFormNotice={unavailableReason ? (
      <div className="mb-5 space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm">
        <p role={groups.isError ? "alert" : "status"}>{unavailableReason}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to={buildBotTabPath(botId, "groups")}>Manage target groups</Link>
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={groups.isFetching}
            onClick={() => { void groups.refetch() }}>
            {groups.isFetching ? "Refreshing groups…" : "Refresh groups"}
          </Button>
        </div>
      </div>
    ) : null}
  />
}
