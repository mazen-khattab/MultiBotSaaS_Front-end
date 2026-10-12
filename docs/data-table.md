# Shared data table

Part 12 provides `DataTable<TData>` and registry `TableConfig<TData>` types. It
does not register bot modules or introduce feature pages or API requests.

Columns describe a stable `key`, text `header`, `accessorKey` or computed
`accessor`, optional `visible`, `format`, and custom `cell`. An accessor function
takes precedence over an accessor key. Cell and formatting callbacks receive the
original typed row so field types remain available even in heterogeneous column
arrays. Custom cells take precedence over formatting. Null values display as an
em dash; objects need an explicit formatter or renderer.

```tsx
import { DataTable } from "@/shared/components/data-table/DataTable"
import type { TableConfig } from "@/registry/configs/tableConfig.types"

type Entry = { id: string; label: string; count: number }

const config = {
  caption: "Entries",
  columns: [
    { key: "label", header: "Label", accessorKey: "label" },
    { key: "count", header: "Count", format: (row) => row.count.toLocaleString() },
  ],
} satisfies TableConfig<Entry>

export function EntryTable({ items }: { items: readonly Entry[] }) {
  return <DataTable {...config} data={items} getRowId={(row) => row.id} />
}
```

Omit `pagination`, or set `{ mode: "none" }`, for complete non-paginated lists.
For a server page, pass the response's `items` as `data` and a pagination object
with `mode: "server"`, `currentPage`, `totalItems`, `totalPages`, the requested
`pageSize`, and `onPageChange(pageNumber)`. Page numbers are 1-based. Optional
`onPageSizeChange` and `pageSizeOptions` enable a page size selector. Callbacks
emit intent only: the feature updates its query parameters and supplies the next
response. Features reset the requested page to 1 when changing filters or page
size. The table never slices or rearranges the supplied items.

TanStack Query consumers can pass `isLoading`, `isFetching`, `error`, and
`onRetry: () => { void query.refetch() }`. Initial loading hides rows; background
fetching retains rows and disables table controls. Errors reuse normalized API
presentation with optional retry, and hide stale rows. Empty copy is configurable.
A required `caption` gives the table an accessible name; server navigation is
available even for an empty page so a feature can recover to an earlier page.

Sort/filter metadata alone never enables controls. A feature must also provide
a controlled `sorting` or `filters` object and translate emitted column keys
into documented server parameters. Sorting emits `{ columnKey, direction }` or
`null`; filter selection emits a string or `undefined` for All. Filter options
must use nonempty unique values because the empty value is reserved for All.
No client sorting, filtering, or search is installed. Toolbar actions are an
optional feature-owned React node.

Under the current backend contract, Leads support only `pageNumber`, `pageSize`,
and `statusFilter`. A Leads feature can declare a status column filter with the
documented options and map its callback to `statusFilter`. It must omit sorting
and search. Accounts and groups return complete lists. Runs now use `botId`,
`pageNumber`, `pageSize`, and `statusFilter` with server totals from the V2 contract.
The Runs integration adds no unsupported sorting or search parameters.

Verification: `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`. `tests/data-table.test.mjs` exercises the production table with
test-only rows, server callbacks, feedback states, capability gating, and the
shared/domain boundary.
