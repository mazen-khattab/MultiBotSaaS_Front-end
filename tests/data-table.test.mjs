import assert from "node:assert/strict"
import { after, afterEach, before, test } from "node:test"
import { readFile, readdir } from "node:fs/promises"

import { JSDOM } from "jsdom"
import React from "react"
import { createServer } from "vite"

const h = React.createElement
let server, dom, DataTable, render, screen, cleanup, fireEvent, within
const originalGlobals = new Map()

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173" })
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, screen, cleanup, fireEvent, within } = await import("@testing-library/react/pure.js"))
  // Load production components through Vite so aliases and the installed v9
  // adapter are exercised together. All rows and controllers below are test-only.
  server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: "custom", optimizeDeps: { noDiscovery: true, include: [] },
  })
  ;({ DataTable } = await server.ssrLoadModule("/src/shared/components/data-table/DataTable.tsx"))
})

afterEach(() => cleanup())
after(async () => {
  await server?.close()
  dom?.window.close()
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

const columns = [
  { key: "name", header: "Name", accessorKey: "name", sortable: true },
  { key: "amount", header: "Amount", accessorKey: "amount", format: (row) => `$${row.amount}` },
  { key: "computed", header: "Computed", accessor: (row) => row.amount * 2 },
  { key: "action", header: "Action", cell: (row) => h("a", { href: `/test/${row.id}` }, `Open ${row.name}`) },
  { key: "hidden", header: "Hidden", accessorKey: "secret", visible: false },
]
const data = [
  { id: "b", name: "Zulu", amount: 2, secret: "Private" },
  { id: "a", name: "Alpha", amount: 1, secret: "Private" },
]
const base = { columns, data, caption: "Test entries", getRowId: (row) => row.id }
const mount = (props = {}) => render(h(DataTable, { ...base, ...props }))
const pagination = (overrides = {}) => ({
  mode: "server", currentPage: 1, pageSize: 10, totalItems: 21, totalPages: 3,
  onPageChange() {}, ...overrides,
})
const bodyRows = () => screen.getAllByRole("row").slice(1)

test("typed configuration renders accessors, formatting, cells, and visibility without changing row order", () => {
  mount()
  assert.ok(screen.getByRole("table", { name: "Test entries" }))
  assert.deepEqual(bodyRows().map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)), [
    ["Zulu", "$2", "4", "Open Zulu"], ["Alpha", "$1", "2", "Open Alpha"],
  ])
  assert.equal(screen.queryByRole("columnheader", { name: "Hidden" }), null)
  assert.equal(screen.queryByText("Private"), null)
  assert.equal(screen.getByRole("link", { name: "Open Zulu" }).getAttribute("href"), "/test/b")
  // Sortable metadata alone must never pretend the backend supports sorting.
  assert.equal(screen.queryByRole("button", { name: "Name" }), null)
  assert.equal(screen.queryByRole("searchbox"), null)
  assert.equal(screen.queryByRole("navigation", { name: "Table pagination" }), null)
})

test("the same component renders unrelated row shapes and explicit non-paginated lists", () => {
  mount({
    data: [{ title: "Different shape", active: false, absent: null, raw: { nested: true } }],
    columns: [
      { key: "title", header: "Title", accessorKey: "title" },
      { key: "active", header: "Active", accessorKey: "active" },
      { key: "absent", header: "Absent", accessorKey: "absent" },
      { key: "raw", header: "Raw", accessorKey: "raw" },
    ], getRowId: undefined, pagination: { mode: "none" },
  })
  assert.deepEqual(within(bodyRows()[0]).getAllByRole("cell").map((cell) => cell.textContent), ["Different shape", "false", "—", "—"])
  assert.equal(screen.queryByRole("navigation"), null)
})

test("server pagination emits 1-based pages and uses server totals without slicing data", () => {
  const requests = []
  const props = pagination({ pageSize: 1, onPageChange: (page) => requests.push(page) })
  const view = mount({ pagination: props })
  assert.equal(bodyRows().length, 2)
  assert.ok(screen.getByText("21 items · Page 1 of 3"))
  assert.equal(screen.getByRole("button", { name: "Previous" }).disabled, true)
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  assert.deepEqual(requests, [2])
  assert.ok(screen.getByText("21 items · Page 1 of 3"))
  view.rerender(h(DataTable, { ...base, pagination: { ...props, currentPage: 3 } }))
  assert.equal(screen.getByRole("button", { name: "Next" }).disabled, true)
  fireEvent.click(screen.getByRole("button", { name: "Previous" }))
  assert.deepEqual(requests, [2, 2])
})

test("page size changes are controlled and unavailable without a handler", () => {
  const changes = []
  const view = mount({ pagination: pagination() })
  assert.equal(screen.queryByRole("combobox", { name: "Rows per page" }), null)
  view.rerender(h(DataTable, { ...base, pagination: pagination({
    pageSize: 7, pageSizeOptions: [10, 10, -1, 25], onPageSizeChange: (size) => changes.push(size),
  }) }))
  const select = screen.getByRole("combobox", { name: "Rows per page" })
  assert.deepEqual([...select.options].map((option) => option.value), ["7", "10", "25"])
  fireEvent.change(select, { target: { value: "25" } })
  assert.deepEqual(changes, [25])
})

test("zero server pages keep both navigation buttons disabled", () => {
  mount({ data: [], pagination: pagination({ totalItems: 0, totalPages: 0 }) })
  assert.ok(screen.getByText("0 items · Page 0 of 0"))
  assert.equal(screen.getByRole("button", { name: "Previous" }).disabled, true)
  assert.equal(screen.getByRole("button", { name: "Next" }).disabled, true)
  assert.ok(screen.getByText("No results"))
})

test("loading replaces stale rows and disables navigation", () => {
  mount({ isLoading: true, pagination: pagination() })
  assert.ok(screen.getByRole("status", { name: "Loading table" }))
  assert.equal(screen.queryByText("Zulu"), null)
  assert.equal(screen.queryByText("No results"), null)
  assert.equal(screen.getByRole("button", { name: "Next" }).disabled, true)
})

test("background fetching retains rows but prevents duplicate page changes", () => {
  mount({ isFetching: true, pagination: pagination() })
  assert.ok(screen.getByText("Zulu"))
  assert.ok(screen.getByText("Updating results…"))
  assert.equal(screen.getByRole("button", { name: "Next" }).disabled, true)
  assert.equal(screen.getByRole("table").parentElement.parentElement.getAttribute("aria-busy"), "true")
})

test("errors use normalized presentation, hide stale rows, and support retry", () => {
  let retries = 0
  mount({
    error: { message: "Test request failed", details: "Sensitive debug detail", innerException: "Internal failure" },
    onRetry: () => { retries += 1 }, pagination: pagination(),
  })
  assert.ok(screen.getByRole("alert"))
  assert.ok(screen.getByText("Test request failed"))
  assert.equal(screen.queryByText("Sensitive debug detail"), null)
  assert.equal(screen.queryByText("Internal failure"), null)
  assert.equal(screen.queryByText("Zulu"), null)
  assert.equal(screen.getByRole("button", { name: "Next" }).disabled, true)
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  assert.equal(retries, 1)
})

test("empty copy is configurable and all-hidden columns have a useful fallback", () => {
  const view = mount({ data: [], emptyTitle: "Nothing here", emptyDescription: "Custom empty explanation" })
  assert.ok(screen.getByText("Nothing here"))
  assert.ok(screen.getByText("Custom empty explanation"))
  view.rerender(h(DataTable, { ...base, columns: columns.map((column) => ({ ...column, visible: false })) }))
  assert.ok(screen.getByText("No visible columns"))
  assert.equal(screen.queryByText("Zulu"), null)
  assert.equal(screen.getByRole("cell").getAttribute("colspan"), "1")
})

test("sorting requires a server controller and only emits intent without locally sorting", () => {
  const requests = []
  function ControlledTable() {
    const [value, setValue] = React.useState(null)
    return h(DataTable, { ...base, sorting: { value, onChange: (next) => { requests.push(next); setValue(next) } } })
  }
  render(h(ControlledTable))
  const button = screen.getByRole("button", { name: "Name" })
  fireEvent.click(button)
  assert.equal(screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort"), "ascending")
  assert.equal(within(bodyRows()[0]).getAllByRole("cell")[0].textContent, "Zulu")
  fireEvent.click(button)
  assert.equal(screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort"), "descending")
  fireEvent.click(button)
  assert.deepEqual(requests, [{ columnKey: "name", direction: "asc" }, { columnKey: "name", direction: "desc" }, null])
  assert.equal(screen.queryByRole("button", { name: "Amount" }), null)
})

test("filter controls require metadata and a controller and never filter the page locally", () => {
  const requests = []
  const filterColumns = [
    { key: "name", header: "Name", accessorKey: "name", filter: { label: "Test category", options: [{ value: "test", label: "Test option" }] } },
    { key: "hidden", header: "Hidden", visible: false, filter: { label: "Hidden filter", options: [] } },
  ]
  const view = mount({ columns: filterColumns })
  assert.equal(screen.queryByRole("combobox"), null)
  view.rerender(h(DataTable, { ...base, columns: filterColumns, filters: {
    values: { name: "test" }, onChange: (key, value) => requests.push([key, value]),
  } }))
  const select = screen.getByRole("combobox", { name: "Test category" })
  assert.equal(select.value, "test")
  assert.equal(screen.queryByRole("combobox", { name: "Hidden filter" }), null)
  assert.equal(bodyRows().length, 2)
  fireEvent.change(select, { target: { value: "" } })
  fireEvent.change(select, { target: { value: "test" } })
  assert.deepEqual(requests, [["name", undefined], ["name", "test"]])
})

test("shared table modules have no domain or registry imports", async () => {
  const directory = new URL("../src/shared/components/data-table/", import.meta.url)
  for (const name of await readdir(directory)) {
    const source = await readFile(new URL(name, directory), "utf8")
    assert.doesNotMatch(source, /from\s+["']@\/(?:features|registry|services)\//, name)
    assert.doesNotMatch(source, /\b(?:Run|Lead|Group|UiModuleCode)\b/, name)
  }
})
