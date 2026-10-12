import { useId, type ReactNode } from "react"

import type { DataTableColumn, DataTableFilters } from "./dataTable.types"

interface DataTableToolbarProps<TData> {
  columns: readonly DataTableColumn<TData>[]
  filters?: DataTableFilters
  actions?: ReactNode
  disabled?: boolean
}

/** Filters only emit intent; the feature maps it to documented query parameters. */
export function DataTableToolbar<TData>({ columns, filters, actions, disabled }: DataTableToolbarProps<TData>) {
  const id = useId()
  const filterColumns = filters ? columns.filter((column) => column.filter) : []
  if (filterColumns.length === 0 && !actions) return null

  return (
    <div role="group" aria-label="Table controls" className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap gap-3">
        {filterColumns.map((column) => (
          <label key={column.key} htmlFor={`${id}-${column.key}`} className="space-y-1 text-sm font-medium">
            <span className="block">{column.filter?.label}</span>
            <select
              id={`${id}-${column.key}`}
              className="h-10 rounded-lg border border-border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={filters?.values[column.key] ?? ""}
              disabled={disabled}
              onChange={(event) => filters?.onChange(column.key, event.target.value || undefined)}
            >
              <option value="">All</option>
              {column.filter?.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {actions}
    </div>
  )
}
