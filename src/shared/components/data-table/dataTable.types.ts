import type { ReactNode } from "react"

/** Semantic columns stay independent of TanStack internals and domain DTOs. */
export interface DataTableColumn<TData> {
  readonly key: string
  readonly header: string
  readonly accessorKey?: keyof TData
  readonly accessor?: (row: TData) => unknown
  readonly visible?: boolean
  // Both callbacks receive the original typed row, including computed columns.
  readonly cell?: (row: TData) => ReactNode
  readonly format?: (row: TData) => string | number | null | undefined
  readonly sortable?: boolean
  readonly filter?: {
    readonly label: string
    readonly options: readonly { readonly value: string; readonly label: string }[]
  }
}

export interface DataTableSort {
  readonly columnKey: string
  readonly direction: "asc" | "desc"
}

/** Supplying a controller confirms server support; metadata alone adds no controls. */
export interface DataTableSorting {
  readonly value: DataTableSort | null
  readonly onChange: (value: DataTableSort | null) => void
}

export interface DataTableFilters {
  readonly values: Readonly<Record<string, string | undefined>>
  readonly onChange: (columnKey: string, value: string | undefined) => void
}

/** Page numbers match the API's 1-based contract. The feature owns fetching. */
export interface DataTableServerPagination {
  readonly mode: "server"
  readonly currentPage: number
  readonly pageSize: number
  readonly totalItems: number
  readonly totalPages: number
  readonly onPageChange: (pageNumber: number) => void
  readonly onPageSizeChange?: (pageSize: number) => void
  readonly pageSizeOptions?: readonly number[]
}

export type DataTablePaginationConfig = DataTableServerPagination | { readonly mode: "none" }

export interface DataTableProps<TData> {
  readonly columns: readonly DataTableColumn<TData>[]
  readonly data: readonly TData[]
  readonly caption: string
  readonly getRowId?: (row: TData, index: number) => string
  readonly pagination?: DataTablePaginationConfig
  readonly sorting?: DataTableSorting
  readonly filters?: DataTableFilters
  readonly toolbarActions?: ReactNode
  readonly isLoading?: boolean
  readonly isFetching?: boolean
  readonly error?: unknown
  readonly onRetry?: () => void
  readonly emptyTitle?: string
  readonly emptyDescription?: string
  readonly className?: string
}
