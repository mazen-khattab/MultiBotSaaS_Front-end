import { useMemo } from "react";

import type { ConnectedAccount } from "@/features/connected-accounts/types/connectedAccounts.types";
import { DataTable } from "@/shared/components/data-table/DataTable";
import type { DataTableColumn } from "@/shared/components/data-table/dataTable.types";
import { Button } from "@/shared/ui/button";

/** Display activation as Enabled/Disabled, never as the missing run status. */
export function AccountsTable({
  accounts,
  isLoading,
  isFetching,
  error,
  onRetry,
  onView,
  onEdit,
  onDelete,
}: {
  readonly accounts: readonly ConnectedAccount[];
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly onView: (id: number) => void;
  readonly onEdit: (id: number) => void;
  readonly onDelete: (id: number) => void;
}) {
  const columns = useMemo<readonly DataTableColumn<ConnectedAccount>[]>(
    () => [
      { key: "name", header: "Account", accessorKey: "displayName" },
      { key: "platform", header: "Platform", accessorKey: "platform" },
      {
        key: "expiry",
        header: "Cookies expire",
        format: (account) => new Date(account.expiresAt).toLocaleString(),
      },
      {
        key: "activation",
        header: "Enabled",
        format: (account) => (account.isActive ? "Enabled" : "Disabled"),
      },
      {
        key: "actions",
        header: "Actions",
        cell: (account) => (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`View ${account.displayName}`}
              onClick={() => onView(account.id)}
            >
              View
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Edit ${account.displayName}`}
              onClick={() => onEdit(account.id)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              aria-label={`Delete ${account.displayName}`}
              onClick={() => onDelete(account.id)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [onView, onEdit, onDelete],
  );
  return (
    <DataTable
      columns={columns}
      data={accounts}
      caption="All your connected accounts"
      getRowId={(account) => String(account.id)}
      onRowClick={(account) => onView(account.id)}
      pagination={{ mode: "none" }}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      emptyTitle="No connected accounts"
      emptyDescription="Add an account to connect it to the current bot."
    />
  );
}
