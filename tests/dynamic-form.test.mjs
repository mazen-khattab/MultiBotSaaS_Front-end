import assert from "node:assert/strict"
import { after, afterEach, before, test } from "node:test"
import { readFile, readdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { JSDOM } from "jsdom"
import React from "react"
import ts from "typescript"
import { createServer } from "vite"
import { z } from "zod"

const h = React.createElement
let server, dom, DynamicForm, DynamicModal, getDynamicFormDefaults
let render, screen, cleanup, fireEvent, waitFor, act
const originalGlobals = new Map()

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173", pretendToBeVisual: true })
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
    MutationObserver: dom.window.MutationObserver, CustomEvent: dom.window.CustomEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  ;({ render, screen, cleanup, fireEvent, waitFor, act } = await import("@testing-library/react/pure.js"))
  server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  ;({ DynamicForm } = await server.ssrLoadModule("/src/shared/components/dynamic-form/DynamicForm.tsx"))
  ;({ DynamicModal } = await server.ssrLoadModule("/src/shared/components/dynamic-form/DynamicModal.tsx"))
  ;({ getDynamicFormDefaults } = await server.ssrLoadModule("/src/shared/components/dynamic-form/dynamicForm.helpers.ts"))
})

afterEach(async () => {
  cleanup()
  // Let Radix finish portal/focus cleanup while DOM globals remain available.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
})
after(async () => {
  await server?.close()
  dom?.window.close()
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name."), note: z.string(),
  quantity: z.number().min(1, "Quantity must be positive."),
  choice: z.string().min(1, "Choose a category."), enabled: z.boolean(), notify: z.boolean(),
})
const config = {
  schema,
  fields: [
    { name: "name", label: "Name", type: "text", description: "Test guidance", required: true },
    { name: "note", label: "Note", type: "textarea", defaultValue: "Test note" },
    { name: "quantity", label: "Quantity", type: "number", defaultValue: 2 },
    { name: "choice", label: "Category", type: "select", defaultValue: "a", options: [{ value: "a", label: "Category A" }, { value: "b", label: "Category B" }] },
    { name: "enabled", label: "Enabled", type: "checkbox" },
    { name: "notify", label: "Notify", type: "switch" },
  ],
}
const mount = (props = {}) => render(h(DynamicForm, { config, label: "Test form", onSubmit() {}, ...props }))
const setName = (value = " Test entry ") => fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value } })
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }))
const validConfig = { ...config, defaultValues: { name: "Existing entry" } }
const selectConfig = { ...validConfig, fields: config.fields.map((field) => field.name === "choice"
  ? { name: "choice", label: "Category", type: "select", optionsProvider: "categories", defaultValue: "a" } : field) }

test("all initial renderers apply typed defaults, labels, and original registry values", async () => {
  const submissions = []
  mount({ onSubmit: (values) => { submissions.push(values) } })
  assert.equal(screen.getByRole("textbox", { name: "Note" }).value, "Test note")
  assert.equal(screen.getByRole("spinbutton", { name: "Quantity" }).value, "2")
  assert.equal(screen.getByRole("combobox", { name: "Category" }).value, "a")
  assert.equal(screen.getByRole("checkbox", { name: "Enabled" }).checked, false)
  assert.equal(screen.getByRole("switch", { name: "Notify" }).checked, false)
  setName()
  fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity" }), { target: { value: "4" } })
  fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "b" } })
  fireEvent.click(screen.getByRole("checkbox", { name: "Enabled" }))
  fireEvent.click(screen.getByRole("switch", { name: "Notify" }))
  submit()
  await waitFor(() => assert.equal(submissions.length, 1))
  assert.deepEqual(submissions[0], { name: "Test entry", note: "Test note", quantity: 4, choice: "b", enabled: true, notify: true })
  assert.equal(config.fields[2].defaultValue, 2)
})

test("Zod validation blocks submissions and connects inline errors and focus to inputs", async () => {
  let submissions = 0
  mount({ onSubmit: () => { submissions += 1 } })
  submit()
  const error = await screen.findByText("Enter a name.")
  const input = screen.getByRole("textbox", { name: "Name" })
  assert.equal(input.getAttribute("aria-invalid"), "true")
  assert.ok(input.getAttribute("aria-describedby").split(" ").includes(error.id))
  await waitFor(() => assert.equal(document.activeElement === input, true))
  assert.equal(submissions, 0)
  setName("Fixed")
  submit()
  await waitFor(() => assert.equal(submissions, 1))
})

test("object-level schema refinements have a visible form error", async () => {
  mount({ config: { ...validConfig, schema: schema.refine(() => false, "The combination is invalid.") } })
  submit()
  assert.ok(await screen.findByText("The combination is invalid."))
})

test("empty optional numbers are undefined and schema output transforms reach the feature", async () => {
  const submissions = []
  mount({
    config: { schema: z.object({ amount: z.number().optional(), choice: z.string().transform(Number) }), fields: [
      { name: "amount", label: "Amount", type: "number", defaultValue: 5 },
      { name: "choice", label: "Choice", type: "select", defaultValue: "42", options: [{ value: "42", label: "Forty two" }] },
    ] }, onSubmit: (values) => { submissions.push(values) },
  })
  fireEvent.change(screen.getByRole("spinbutton", { name: "Amount" }), { target: { value: "" } })
  submit()
  await waitFor(() => assert.equal(submissions.length, 1))
  assert.deepEqual(submissions[0], { amount: undefined, choice: 42 })
})

test("form defaults override field defaults and nested defaults are cloned", async () => {
  const nested = {
    schema: z.object({ details: z.object({ name: z.string() }), optional: z.string().nullable() }),
    fields: [{ name: "details.name", label: "Nested name", type: "text", defaultValue: "Field default" }, { name: "optional", label: "Optional", type: "text", defaultValue: null }],
    defaultValues: { details: { name: "Form default" } },
  }
  const defaults = getDynamicFormDefaults(nested)
  assert.deepEqual(defaults, { details: { name: "Form default" }, optional: null })
  defaults.details.name = "Changed"
  assert.equal(nested.defaultValues.details.name, "Form default")
  const submissions = []
  mount({ config: nested, onSubmit: (values) => { submissions.push(values) } })
  fireEvent.change(screen.getByRole("textbox", { name: "Nested name" }), { target: { value: "Updated" } })
  submit()
  await waitFor(() => assert.equal(submissions.length, 1))
  assert.deepEqual(submissions[0], { details: { name: "Updated" }, optional: null })
})

test("visibility and disabled rules react to values while retaining data for the schema", async () => {
  const submissions = []
  mount({ config: { ...validConfig, fields: config.fields.map((field) => field.name === "note"
    ? { ...field, visible: (values) => values.enabled, disabled: (values) => values.notify } : field) },
    onSubmit: (values) => { submissions.push(values) },
  })
  assert.equal(screen.queryByRole("textbox", { name: "Note" }), null)
  fireEvent.click(screen.getByRole("checkbox", { name: "Enabled" }))
  fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "Retained note" } })
  fireEvent.click(screen.getByRole("switch", { name: "Notify" }))
  assert.equal(screen.getByRole("textbox", { name: "Note" }).disabled, true)
  fireEvent.click(screen.getByRole("checkbox", { name: "Enabled" }))
  submit()
  await waitFor(() => assert.equal(submissions.length, 1))
  assert.equal(submissions[0].note, "Retained note")
})

test("feature-owned select options support loading, safe errors, retry, and refreshed results", async () => {
  let retries = 0
  const view = mount({ config: selectConfig, options: { categories: { items: [], isLoading: true } } })
  assert.ok(screen.getByText("Loading options…"))
  assert.equal(screen.getByRole("combobox", { name: "Category" }).disabled, true)
  assert.equal(screen.getByRole("button", { name: "Submit" }).disabled, true)
  view.rerender(h(DynamicForm, { config: selectConfig, label: "Test form", onSubmit() {}, options: {
    categories: { items: [], error: "Could not load test options.", onRetry: () => { retries += 1 } },
  } }))
  fireEvent.click(screen.getByRole("button", { name: "Retry options" }))
  assert.equal(retries, 1)
  assert.equal(screen.getByRole("button", { name: "Submit" }).disabled, true)
  const submissions = []
  view.rerender(h(DynamicForm, { config: selectConfig, label: "Test form", onSubmit: (values) => { submissions.push(values) }, options: {
    categories: { items: [{ value: "a", label: "Loaded option" }] },
  } }))
  assert.equal(screen.getByRole("combobox", { name: "Category" }).disabled, false)
  submit()
  await waitFor(() => assert.equal(submissions.length, 1))
})

test("missing providers block submit and stale or disabled selections cannot be submitted", async () => {
  const submissions = []
  const view = mount({ config: selectConfig, onSubmit: (values) => { submissions.push(values) } })
  assert.ok(screen.getByText("Options are unavailable."))
  assert.equal(screen.getByRole("button", { name: "Submit" }).disabled, true)
  for (const items of [[{ value: "b", label: "Different option" }], [{ value: "a", label: "Disabled option", disabled: true }]]) {
    view.rerender(h(DynamicForm, { config: selectConfig, label: "Test form", onSubmit: (values) => { submissions.push(values) }, options: { categories: { items } } }))
    submit()
    await screen.findByText("Choose an available option.")
    assert.equal(submissions.length, 0)
  }
})

test("async submit locks rapid events and preserves values after a safe feature error", async () => {
  let resolve, calls = 0
  const pending = new Promise((done) => { resolve = done })
  const transitions = []
  mount({ config: validConfig, onSubmit: () => { calls += 1; return pending }, onSubmittingChange: (value) => transitions.push(value) })
  fireEvent.submit(screen.getByRole("form", { name: "Test form" }))
  fireEvent.submit(screen.getByRole("form", { name: "Test form" }))
  await waitFor(() => assert.equal(calls, 1))
  assert.equal(screen.getByRole("button", { name: "Submitting…" }).disabled, true)
  assert.equal(screen.getByRole("textbox", { name: "Name" }).disabled, true)
  await act(async () => { resolve({ status: "error", message: "Test action is unavailable." }); await pending })
  assert.ok(screen.getByText("Test action is unavailable."))
  assert.equal(screen.getByRole("textbox", { name: "Name" }).value, "Existing entry")
  assert.deepEqual(transitions, [true, false])
})

test("secret inputs and thrown submit payloads are neither logged nor displayed", async () => {
  const messages = []
  const originalLog = console.log
  console.log = (...args) => messages.push(args)
  try {
    mount({ config: { schema: z.object({ secret: z.string() }), fields: [{ name: "secret", label: "Secret", type: "text", sensitive: true }] },
      onSubmit: () => { throw { message: "SECRET_TEST_VALUE", details: "SECRET_TEST_VALUE", request: { cookies: "SECRET_TEST_VALUE" } } },
    })
    const input = screen.getByLabelText("Secret")
    assert.equal(input.type, "password")
    assert.equal(input.autocomplete, "off")
    fireEvent.change(input, { target: { value: "SECRET_TEST_VALUE" } })
    submit()
    await screen.findByText("Unable to submit. Please try again.")
    assert.equal(screen.queryByText("SECRET_TEST_VALUE"), null)
    assert.deepEqual(messages, [])
  } finally { console.log = originalLog }
})

function ModalHarness({ onSubmit, onSuccess, config: modalConfig = validConfig }) {
  const [open, setOpen] = React.useState(false)
  return h(React.Fragment, null,
    h("button", { onClick: () => setOpen(true) }, "Open form"),
    h(DynamicModal, { title: "Test modal", description: "Test modal description", open, onOpenChange: setOpen, config: modalConfig, onSubmit, onSuccess }),
  )
}

test("modal has accessible title/description, closes on cancel, and resets the next session", async () => {
  render(h(ModalHarness, { onSubmit() {} }))
  const trigger = screen.getByRole("button", { name: "Open form" })
  fireEvent.click(trigger)
  const dialog = await screen.findByRole("dialog", { name: "Test modal" })
  assert.equal(document.getElementById(dialog.getAttribute("aria-describedby")).textContent, "Test modal description")
  setName("Changed entry")
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true))
  fireEvent.click(trigger)
  await screen.findByRole("dialog")
  assert.equal(screen.getByRole("textbox", { name: "Name" }).value, "Existing entry")
})

test("modal blocks dismissal during submission and closes only after success", async () => {
  let resolve, calls = 0, successes = 0
  const pending = new Promise((done) => { resolve = done })
  render(h(ModalHarness, { onSubmit: () => { calls += 1; return pending }, onSuccess: () => { successes += 1 } }))
  fireEvent.click(screen.getByRole("button", { name: "Open form" }))
  await screen.findByRole("dialog")
  submit()
  await waitFor(() => assert.equal(calls, 1))
  assert.equal(screen.getByRole("button", { name: "Cancel" }).disabled, true)
  assert.equal(screen.getByRole("button", { name: "Close dialog" }).disabled, true)
  fireEvent.keyDown(document.activeElement, { key: "Escape" })
  assert.ok(screen.getByRole("dialog"))
  await act(async () => { resolve({ status: "success" }); await pending })
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true))
  assert.equal(successes, 1)
})

test("modal keeps failed input and permits a successful retry", async () => {
  let calls = 0
  render(h(ModalHarness, { onSubmit: async () => ++calls === 1 ? { status: "error", message: "Try this test again." } : { status: "success" } }))
  fireEvent.click(screen.getByRole("button", { name: "Open form" }))
  await screen.findByRole("dialog")
  setName("Retry entry")
  submit()
  await screen.findByText("Try this test again.")
  assert.equal(screen.getByRole("textbox", { name: "Name" }).value, "Retry entry")
  submit()
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true))
  assert.equal(calls, 2)
})

test("an abandoned modal submission cannot close a newly opened session", async () => {
  let resolve, calls = 0, closes = 0
  const pending = new Promise((done) => { resolve = done })
  const props = { title: "Test modal", config: validConfig, onOpenChange: () => { closes += 1 }, onSubmit: () => { calls += 1; return pending } }
  const view = render(h(DynamicModal, { ...props, open: true }))
  await screen.findByRole("dialog")
  submit()
  await waitFor(() => assert.equal(calls, 1))
  view.rerender(h(DynamicModal, { ...props, open: false }))
  view.rerender(h(DynamicModal, { ...props, open: true }))
  await screen.findByRole("dialog")
  await act(async () => { resolve(); await pending })
  assert.ok(screen.getByRole("dialog"))
  assert.equal(closes, 0)
})

test("public types preserve input/output transforms and reject incompatible configs", () => {
  const project = fileURLToPath(new URL("../tsconfig.app.json", import.meta.url))
  const loaded = ts.readConfigFile(project, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, fileURLToPath(new URL("../", import.meta.url)))
  const program = ts.createProgram([fileURLToPath(new URL("./dynamic-form.types.fixture.ts", import.meta.url))], { ...parsed.options, tsBuildInfoFile: undefined })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => "\n",
  }))
})

test("shared form modules contain no feature/API integration, logs, persistence, or evaluated code", async () => {
  const directory = new URL("../src/shared/components/dynamic-form/", import.meta.url)
  for (const name of await readdir(directory)) {
    const source = await readFile(new URL(name, directory), "utf8")
    assert.doesNotMatch(source, /from\s+["']@\/(?:features|registry|services|core\/api)\//, name)
    assert.doesNotMatch(source, /\b(?:CreateRunDto|UiModuleCode)\b|console\.|localStorage|sessionStorage|\beval\s*\(|new Function\b/, name)
  }
})
