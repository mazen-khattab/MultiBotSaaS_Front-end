import { useCallback, useRef, useState } from "react";

import { AccountForm } from "@/features/connected-accounts/components/AccountForm";
import { AccountsTable } from "@/features/connected-accounts/components/AccountsTable";
import { useConnectedAccount } from "@/features/connected-accounts/hooks/useConnectedAccount";
import { useConnectedAccountMutations } from "@/features/connected-accounts/hooks/useConnectedAccountMutations";
import { useConnectedAccounts } from "@/features/connected-accounts/hooks/useConnectedAccounts";
import type { BotTabComponentProps } from "@/registry/botRegistry.types";
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog";

type AccountDialogState =
  | { mode: "create" }
  | { mode: "view" | "edit" | "delete"; id: number };

/** A mounted dialog owns fresh details and discards its form when it closes. */
function AccountDialog({
  selection,
  botId,
  onClose,
  onSaved,
}: {
  readonly selection: AccountDialogState;
  readonly botId: number;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
}) {
  const details = useConnectedAccount(
    botId,
    selection.mode === "create" ? null : selection.id,
  );
  const mutation = useConnectedAccountMutations();
  const deleting = useRef(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const account = details.data;
  const busy = saving || mutation.isPending;
  // A prior View dialog may have cached this row. Wait for this dialog's read
  // before initializing edit defaults; keep the form mounted during later reads.
  const freshDetails = details.isFetchedAfterMount;
  const showForm =
    selection.mode === "create" ||
    (selection.mode === "edit" &&
      Boolean(account) &&
      freshDetails &&
      !details.error);
  const title =
    selection.mode === "create"
      ? "Add connected account"
      : selection.mode === "edit"
        ? "Edit connected account"
        : selection.mode === "delete"
          ? "Delete connected account"
          : "Connected account details";

  async function remove() {
    if (selection.mode !== "delete" || deleting.current) return;
    deleting.current = true;
    setFailure(null);
    try {
      await mutation.delete(selection.id);
      onSaved("Connected account deleted.");
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
          Accounts are shared across your workspaces. Changes apply to the
          selected account wherever it is used.
        </DialogDescription>
        {selection.mode !== "create" && !freshDetails && !details.error ? (
          <p role="status" className="py-4">
            Loading account details…
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
          <AccountForm
            botId={botId}
            account={selection.mode === "create" ? undefined : account}
            onCancel={onClose}
            onSubmittingChange={setSaving}
            onSaved={() =>
              onSaved(
                selection.mode === "create"
                  ? "Connected account created."
                  : "Connected account updated.",
              )
            }
          />
        ) : null}
        {selection.mode === "view" && account && !details.error ? (
          <dl className="grid grid-cols-2 gap-3 py-5 text-sm">
            <dt>Account</dt>
            <dd className="break-words">{account.displayName}</dd>
            <dt>Platform</dt>
            <dd>{account.platform}</dd>
            <dt>Enabled</dt>
            <dd>{account.isActive ? "Enabled" : "Disabled"}</dd>
            <dt>Cookies expire</dt>
            <dd>{new Date(account.expiresAt).toLocaleString()}</dd>
            <dt>Masked cookies</dt>
            <dd className="break-words">{account.maskedCookies}</dd>
            <dt>Related leads</dt>
            <dd>{account.relatedLeadsCount}</dd>
            <dt>Runs</dt>
            <dd>{account.runsCount}</dd>
          </dl>
        ) : null}
        {selection.mode === "delete" &&
          account &&
          freshDetails &&
          !details.error ? (
          <div className="space-y-4 py-5">
            <p className="text-sm">
              Delete {account.displayName}? This removes the connected account
              from your user account.
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

/** The workspace supplies creation context only, never list filtering authority. */
function ConnectedAccountsSession({ botId }: BotTabComponentProps) {
  const accounts = useConnectedAccounts({ botId: Number(botId) });
  const [selection, setSelection] = useState<AccountDialogState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const onView = useCallback((id: number) => {
    setNotice(null);
    setSelection({ mode: "view", id });
  }, []);
  const onEdit = useCallback((id: number) => {
    setNotice(null);
    setSelection({ mode: "edit", id });
  }, []);
  const onDelete = useCallback((id: number) => {
    setNotice(null);
    setSelection({ mode: "delete", id });
  }, []);

  return (
    <section aria-label="Connected accounts" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">All your connected accounts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your platform accounts. New accounts are assigned to this
            bot.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setNotice(null);
            setSelection({ mode: "create" });
          }}
        >
          Add account
        </Button>
      </div>
      {notice ? (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      ) : null}
      <AccountsTable
        accounts={accounts.data ?? []}
        isLoading={accounts.isPending}
        isFetching={accounts.isFetching}
        error={accounts.error}
        onRetry={() => {
          void accounts.refetch();
        }}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {selection ? (
        <AccountDialog
          key={
            selection.mode === "create"
              ? "create"
              : `${selection.mode}:${selection.id}`
          }
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

/** Navigating to another bot drops open dialogs and any unsubmitted input. */
export default function ConnectedAccountsPage(props: BotTabComponentProps) {
  return <ConnectedAccountsSession key={props.botId} {...props} />;
}
