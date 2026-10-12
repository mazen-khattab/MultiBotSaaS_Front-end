import { useId } from "react"

import { Button } from "@/shared/ui/button"
import type { DataTableServerPagination } from "./dataTable.types"

interface DataTablePaginationProps {
  pagination: DataTableServerPagination
  disabled?: boolean
}

/** Use server totals, never the current page length, to determine navigation. */
export function DataTablePagination({ pagination, disabled }: DataTablePaginationProps) {
  const id = useId()
  const { currentPage, totalItems, totalPages, pageSize } = pagination
  const options = [...new Set([pageSize, ...(pagination.pageSizeOptions ?? [10, 25, 50])])]
    .filter((size) => Number.isInteger(size) && size > 0).sort((left, right) => left - right)

  return (
    <nav aria-label="Table pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground" aria-live="polite">
        {totalItems} items · Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {pagination.onPageSizeChange ? (
          <label htmlFor={id} className="flex items-center gap-2">
            Rows per page
            <select
              id={id}
              className="h-9 rounded-lg border border-border bg-background px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={pageSize}
              disabled={disabled}
              onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
            >
              {options.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        ) : null}
        <Button type="button" variant="outline" size="sm" disabled={disabled || currentPage <= 1 || totalPages === 0}
          onClick={() => pagination.onPageChange(currentPage - 1)}>
          Previous
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled || currentPage >= totalPages}
          onClick={() => pagination.onPageChange(currentPage + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
