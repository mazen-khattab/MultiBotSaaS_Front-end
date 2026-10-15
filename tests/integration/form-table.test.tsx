import { screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { z } from "zod"

import { DataTable } from "@/shared/components/data-table/DataTable"
import { DynamicForm } from "@/shared/components/dynamic-form/DynamicForm"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"
import { renderWithProviders } from "@/test/renderWithProviders"

test("schema validation prevents submission and parsed values reach the feature", async () => {
  const config: DynamicFormConfig<{ name: string }> = { schema: z.object({ name: z.string().trim().min(1, "Enter a name.") }),
    fields: [{ name: "name", type: "text", label: "Name", required: true }], defaultValues: { name: "" } }
  const submit = vi.fn()
  const { user } = renderWithProviders(<DynamicForm config={config} label="Test form" onSubmit={submit} />)
  await user.click(screen.getByRole("button", { name: "Submit" }))
  expect(await screen.findByText("Enter a name.")).toBeInTheDocument()
  expect(submit).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText("Name"), "  Reviewed  ")
  await user.click(screen.getByRole("button", { name: "Submit" }))
  expect(submit).toHaveBeenCalledExactlyOnceWith({ name: "Reviewed" })
})

test("server pagination emits intent without slicing the server page or inventing totals", async () => {
  const pageChange = vi.fn(), sizeChange = vi.fn()
  const { user } = renderWithProviders(<DataTable caption="Server rows" data={[{ id: 31, name: "Only server row" }]}
    columns={[{ key: "name", header: "Name", accessorKey: "name" }]}
    pagination={{ mode: "server", currentPage: 2, pageSize: 10, totalItems: 42, totalPages: 5,
      onPageChange: pageChange, onPageSizeChange: sizeChange }} />)
  expect(screen.getByText("Only server row")).toBeInTheDocument()
  expect(screen.getByText(/42 items/)).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Next" }))
  await user.click(screen.getByRole("button", { name: "Previous" }))
  await user.selectOptions(screen.getByLabelText("Rows per page"), "25")
  expect(pageChange.mock.calls).toEqual([[3], [1]])
  expect(sizeChange).toHaveBeenCalledExactlyOnceWith(25)
  expect(screen.getByText("Only server row")).toBeInTheDocument()
})

test("zero server pages disable both pagination directions", () => {
  renderWithProviders(<DataTable caption="Empty server page" data={[]} columns={[{ key: "name", header: "Name" }]}
    pagination={{ mode: "server", currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0, onPageChange: vi.fn() }} />)
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
})
