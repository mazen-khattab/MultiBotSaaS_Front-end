import type { DataTableColumn } from "@/shared/components/data-table/dataTable.types"

/** Registry configs describe columns; shared components own their rendering. */
export type TableColumnConfig<TData> = DataTableColumn<TData>

export interface TableConfig<TData> {
  readonly caption: string
  readonly columns: readonly TableColumnConfig<TData>[]
  readonly emptyTitle?: string
  readonly emptyDescription?: string
}
