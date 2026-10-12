import { useRef } from "react";

import { useCancelRun } from "@/features/runs/hooks/useCancelRun";
import type { RunDto } from "@/features/runs/types/runs.types";
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert";
import { Button } from "@/shared/ui/button";

/** Actions use current server rows; running state never comes from local timers. */
export function RunActions({
  run,
  canCancel,
  onView,
}: {
  readonly run: RunDto;
  readonly canCancel: boolean;
  readonly onView?: () => void;
}) {
  const mutation = useCancelRun();
  const pending = useRef(false);
  async function cancel() {
    if (pending.current) return;
    pending.current = true;
    try {
      await mutation.mutateAsync(run);
    } catch {
      /* The normalized error is displayed below. */
    } finally {
      pending.current = false;
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {onView ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onView}
            aria-label={`View run #${run.id}`}
          >
            Details
          </Button>
        ) : null}
        {canCancel && run.status === "Running" && run.endedAt === null ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => {
              void cancel();
            }}
            aria-label={`Cancel run #${run.id}`}
          >
            {mutation.isPending ? "Cancelling…" : "Cancel"}
          </Button>
        ) : null}
      </div>
      <ApiErrorAlert error={mutation.error} title="Unable to cancel run" />
    </div>
  );
}
