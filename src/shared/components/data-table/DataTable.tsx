import { tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo } from "react";

import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { DataTableEmptyState } from "./DataTableEmptyState";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import type { DataTableProps } from "./dataTable.types";

// Core rows only: data arrives already paged, filtered, and ordered by the server.
// No client sorting/filtering/pagination row models can change the supplied rows.
const features = tableFeatures({});

/** Renders arbitrary typed rows; features retain ownership of queries and state. */
export function DataTable<TData extends object>({
  columns,
  data,
  caption,
  getRowId,
  onRowClick,
  pagination,
  sorting,
  filters,
  toolbarActions,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  className,
}: DataTableProps<TData>) {
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible !== false),
    [columns],
  );
  const definitions = useMemo<ColumnDef<typeof features, TData, unknown>[]>(
    () =>
      visibleColumns.map((column) => ({
        id: column.key,
        header: column.header,
        accessorFn: (row) =>
          column.accessor
            ? column.accessor(row)
            : column.accessorKey !== undefined
              ? row[column.accessorKey]
              : undefined,
        cell: ({ row, getValue }) => {
          // Custom cells and formatters deliberately receive the typed original row.
          // Objects require explicit presentation instead of leaking JSON into a cell.
          if (column.cell) return column.cell(row.original);
          if (column.format) return column.format(row.original);
          const value: unknown = getValue();
          return value === null || value === undefined
            ? "—"
            : typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
              ? String(value)
              : "—";
        },
      })),
    [visibleColumns],
  );
  const table = useTable({ features, columns: definitions, data, getRowId });
  const busy = isLoading || isFetching;
  const hasError = error !== null && error !== undefined;
  const span = Math.max(visibleColumns.length, 1);

  return (
    <div className={cn("min-w-0 max-w-full space-y-4", className)} aria-busy={busy}>
      <DataTableToolbar
        columns={visibleColumns}
        filters={filters}
        actions={toolbarActions}
        disabled={busy}
      />
      {isFetching && !isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Updating results…
        </p>
      ) : null}
      <div
        role="region"
        aria-label={`${caption} — scroll horizontally`}
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-lg border border-border"
      >
        <table className="w-max min-w-full table-auto text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-muted/50">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const column = visibleColumns.find(
                    (candidate) => candidate.key === header.column.id,
                  );
                  const canSort =
                    column?.sortable === true && sorting !== undefined;
                  const direction =
                    canSort && sorting.value?.columnKey === column.key
                      ? sorting.value.direction
                      : undefined;
                  const Icon =
                    direction === "asc"
                      ? ArrowUp
                      : direction === "desc"
                        ? ArrowDown
                        : ArrowUpDown;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-left font-medium"
                      aria-sort={
                        canSort
                          ? direction === "asc"
                            ? "ascending"
                            : direction === "desc"
                              ? "descending"
                              : "none"
                          : undefined
                      }
                    >
                      {canSort ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            sorting.onChange(
                              direction === "desc"
                                ? null
                                : {
                                    columnKey: column.key,
                                    direction:
                                      direction === "asc" ? "desc" : "asc",
                                  },
                            )
                          }
                        >
                          {column.header}
                          <Icon aria-hidden="true" />
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={span} className="p-4">
                  <div
                    role="status"
                    aria-label="Loading table"
                    className="space-y-3"
                  >
                    <span className="sr-only">Loading results…</span>
                    {[0, 1, 2].map((key) => (
                      <Skeleton
                        key={key}
                        className="h-9 w-full"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ) : hasError ? (
              <tr>
                <td colSpan={span} className="p-4">
                  <ApiErrorAlert
                    error={error}
                    title="Unable to load results"
                    onRetry={onRetry}
                    retrying={isFetching}
                  />
                </td>
              </tr>
            ) : visibleColumns.length === 0 ? (
              <tr>
                <td colSpan={span}>
                  <DataTableEmptyState
                    title="No visible columns"
                    description="No columns are configured for display."
                  />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={span}>
                  <DataTableEmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b last:border-0 hover:bg-muted/50",
                    onRowClick && "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  title={onRowClick ? "View details" : undefined}
                  aria-description={onRowClick ? "Press Enter or Space to view details." : undefined}
                  onClick={onRowClick ? (event) => {
                    const target = event.target as HTMLElement;
                    // Cell controls and portalled menus keep their own actions.
                    if (event.defaultPrevented || !event.currentTarget.contains(target) || target.closest(
                      'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="combobox"], [role="menuitem"], [contenteditable]:not([contenteditable="false"]), [data-row-click-ignore]',
                    )) return;
                    const selection = event.currentTarget.ownerDocument.getSelection();
                    // Selecting a long value should leave it available to copy.
                    if (selection && !selection.isCollapsed && event.currentTarget.contains(selection.anchorNode)) return;
                    onRowClick(row.original);
                  } : undefined}
                  onKeyDown={onRowClick ? (event) => {
                    if (event.defaultPrevented || event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row.original);
                    }
                  } : undefined}
                >
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top">
                      {/* Give long values a readable width without squeezing other columns. */}
                      <div className="w-max max-w-[40rem] whitespace-pre-wrap [overflow-wrap:anywhere]">
                        <table.FlexRender cell={cell} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination?.mode === "server" ? (
        <DataTablePagination
          pagination={pagination}
          disabled={busy || hasError}
        />
      ) : null}
    </div>
  );
}
