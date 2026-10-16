import { useCallback, useRef, useState } from "react";

import type { GroupsPageConfig } from "@/registry/configs/groupsConfig.types"
import { GroupForm } from "@/features/groups/components/GroupForm";
import {
  GroupLink,
  GroupsTable,
} from "@/features/groups/components/GroupsTable";
import { useGroup } from "@/features/groups/hooks/useGroup";
import { useGroupMutations } from "@/features/groups/hooks/useGroupMutations";
import { useGroups } from "@/features/groups/hooks/useGroups";
import type { BotTabComponentProps } from "@/registry/botRegistry.types";
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog";

type GroupSelection =
  | { mode: "create" }
  | { mode: "view" | "edit" | "delete"; id: number };

interface GroupsPageProps extends BotTabComponentProps {
  readonly config?: GroupsPageConfig
}

/** Each dialog fetches fresh details before enabling edits or deletion. */
function GroupDialog({
  selection,
  groupsConfig,
  botId,
  onClose,
  onSaved,
}: {
  readonly selection: GroupSelection;
  readonly groupsConfig?: GroupsPageConfig
  readonly botId: number;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
}) {
  const details = useGroup(
    botId,
    selection.mode === "create" ? null : selection.id,
  );
  console.log("GroupDialog selection", selection, "details", details, "groupsConfig", groupsConfig)
  const mutation = useGroupMutations();
  const deleting = useRef(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const busy = saving || mutation.isPending;
  const group = details.data;
  const ready = Boolean(group) && details.isFetchedAfterMount && !details.error;
  const showForm =
    selection.mode === "create" || (selection.mode === "edit" && ready);
  const title =
    selection.mode === "create"
      ? "Add target group"
      : selection.mode === "edit"
        ? "Edit target group"
        : selection.mode === "delete"
          ? "Delete target group"
          : "Target group details";

  async function remove() {
    if (selection.mode !== "delete" || deleting.current) return;
    deleting.current = true;
    setFailure(null);
    try {
      await mutation.delete(selection.id);
      onSaved("Target group deleted.");
    } catch (error: unknown) {
      setFailure(error);
    } finally {
      deleting.current = false;
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="mt-2 text-sm">
          {selection.mode === "create"
            ? `New groups are assigned to bot ${botId}.`
            : "Manage the selected target group for this bot."}
        </DialogDescription>
        {selection.mode !== "create" && !ready && !details.error ? (
          <p role="status" className="py-4">
            Loading group details…
          </p>
        ) : null}
        {selection.mode !== "create" ? (
          <ApiErrorAlert
            error={details.error}
            onRetry={() => {
              void details.refetch();
            }}
            retrying={details.isFetching}
          />
        ) : null}
        {showForm ? (
          <GroupForm
            botId={botId}
            groupsConfig={groupsConfig}
            group={selection.mode === "create" ? undefined : group}
            onCancel={onClose}
            onSubmittingChange={setSaving}
            onSaved={() =>
              onSaved(
                selection.mode === "create"
                  ? "Target group created."
                  : "Target group updated.",
              )
            }
          />
        ) : null}
        {selection.mode === "view" && ready && group ? (
          <dl className="grid grid-cols-2 gap-3 py-5 text-sm">
            <dt>Group</dt>
            <dd className="break-words">{group.groupName}</dd>
            <dt>Group URL</dt>
            <dd className="min-w-0">
              <GroupLink value={group.groupUrl} />
            </dd>
            <dt>Enabled</dt>
            <dd>{group.isActive ? "Enabled" : "Disabled"}</dd>
            <dt>Configuration JSON</dt>
            <dd>
              <pre className="whitespace-pre-wrap break-all">
                {group.configJson}
              </pre>
            </dd>
            <dt>Related leads</dt>
            <dd>{group.relatedLeadsCount}</dd>
            <dt>Runs</dt>
            <dd>{group.runsCount}</dd>
          </dl>
        ) : null}
        {selection.mode === "delete" && ready && group ? (
          <div className="space-y-4 py-5">
            <p className="text-sm">
              Delete {group.groupName}? This removes the selected target group.
            </p>
            <ApiErrorAlert error={failure} />
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                void remove();
              }}
            >
              {busy ? "Deleting…" : "Confirm delete"}
            </Button>
          </div>
        ) : null}
        {!showForm ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** The workspace supplies botId for both creation and server-scoped reads. */
function GroupsSession({ botId, config }: GroupsPageProps) {
  const groups = useGroups(Number(botId));
  const [selection, setSelection] = useState<GroupSelection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const onSelect = useCallback(
    (mode: "view" | "edit" | "delete", id: number) => {
      setNotice(null);
      setSelection({ mode, id });
    },
    [],
  );

  return (
    <section aria-label="Target groups" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Target groups</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the target groups assigned to this bot.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setNotice(null);
            setSelection({ mode: "create" });
          }}
        >
          Add group
        </Button>
      </div>
      {notice ? (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      ) : null}
      <GroupsTable
        groups={groups.data ?? []}
        isLoading={groups.isPending}
        isFetching={groups.isFetching}
        error={groups.error}
        onRetry={() => {
          void groups.refetch();
        }}
        onSelect={onSelect}
      />
      {selection ? (
        <GroupDialog
          key={
            selection.mode === "create"
              ? "create"
              : `${selection.mode}:${selection.id}`
          }
          groupsConfig={config}
          selection={selection}
          botId={Number(botId)}
          onClose={() => setSelection(null)}
          onSaved={(message) => {
            setSelection(null);
            setNotice(message);
          }}
        />
      ) : null}
    </section>
  );
}

/** Changing workspace discards the current dialog and its unsubmitted form. */
export default function GroupsPage(props: GroupsPageProps) {
  return <GroupsSession key={props.botId} {...props} />;
}
