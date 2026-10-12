import { useRun } from "@/features/runs/hooks/useRuns"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog"

/** Fetch details on demand instead of treating a list or create result as detail. */
export function RunDetailDialog({ runId, botId, onClose }: { readonly runId: number; readonly botId: number; readonly onClose: () => void }) {
  const query = useRun(runId)
  const run = query.data?.botId === botId ? query.data : undefined
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="text-lg font-semibold">Run #{runId}</DialogTitle>
        {query.isPending ? <p role="status">Loading run details…</p> : null}
        <ApiErrorAlert error={query.error} onRetry={() => { void query.refetch() }} retrying={query.isFetching} />
        {!query.isPending && !query.error && !run ? <p role="alert">This run does not belong to the current bot workspace.</p> : null}
        {run ? <dl className="grid grid-cols-2 gap-3 py-4 text-sm">
          <dt>Status</dt><dd>{run.status}</dd>
          <dt>Collected leads</dt><dd>{run.collectedLeadsCount}</dd>
          <dt>Account</dt><dd>{run.accountId ?? "—"}</dd>
          <dt>Target group</dt><dd>{run.groupId ?? "—"}</dd>
          <dt>Started</dt><dd>{new Date(run.startedAt).toLocaleString()}</dd>
          <dt>Ended</dt><dd>{run.endedAt ? new Date(run.endedAt).toLocaleString() : "—"}</dd>
        </dl> : null}
        <Button type="button" variant="outline" onClick={onClose}>Close details</Button>
      </DialogContent>
    </Dialog>
  )
}
