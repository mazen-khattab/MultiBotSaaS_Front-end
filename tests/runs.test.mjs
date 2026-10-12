import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { JSDOM } from "jsdom";
import React from "react";
import ts from "typescript";
import { createServer } from "vite";
import { z } from "zod";

const h = React.createElement;
let server,
  dom,
  api,
  RunsService,
  EligibleAccountsService,
  createRunAdapter,
  GenericRunsPage;
let render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
  originalAdapter,
  eligibleResponse,
  eligibleInterceptor;
const originalGlobals = new Map();
const clients = [];

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:5173",
    pretendToBeVisual: true,
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    MutationObserver: dom.window.MutationObserver,
    CustomEvent: dom.window.CustomEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  ({ render, screen, cleanup, fireEvent, waitFor, act } =
    await import("@testing-library/react/pure.js"));
  server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ api } = await server.ssrLoadModule("/src/core/api/api.ts"));
  ({ RunsService } = await server.ssrLoadModule(
    "/src/features/runs/services/RunsService.ts",
  ));
  ({ EligibleAccountsService } = await server.ssrLoadModule(
    "/src/features/runs/services/EligibleAccountsService.ts",
  ));
  ({ createRunAdapter } = await server.ssrLoadModule(
    "/src/features/runs/adapters/createRunAdapter.ts",
  ));
  ({ default: GenericRunsPage } = await server.ssrLoadModule(
    "/src/features/runs/pages/GenericRunsPage.tsx",
  ));
  originalAdapter = api.defaults.adapter;
  // Route eligible reads separately so each test's write adapter remains real.
  eligibleInterceptor = api.interceptors.request.use((request) => {
    if (request.url === "/api/v1/connectedaccounts/eligible")
      request.adapter = eligibleResponse;
    return request;
  });
});

beforeEach(() => {
  eligibleResponse = async (request) => success(request, accounts);
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  clients.splice(0).forEach((client) => client.clear());
  api.defaults.adapter = originalAdapter;
});
after(async () => {
  api.interceptors.request.eject(eligibleInterceptor);
  await server?.close();
  dom?.window.close();
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

const success = (config, data = 42) => ({
  config,
  status: 200,
  statusText: "OK",
  headers: {},
  data: {
    isSuccess: true,
    message: "Run started successfully.",
    errorType: 0,
    data,
  },
});
const failure = (config, status, message) =>
  new AxiosError(
    "Request failed",
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    {
      config,
      status,
      statusText: "Error",
      headers: {},
      data: {
        isSuccess: false,
        statusCode: status,
        message,
        path: "/api/v1/runs",
        method: "POST",
        traceId: "test-trace",
      },
    },
  );
const capabilities = {
  canCreateRun: true,
  canListRuns: false,
  canGetRun: false,
  canCancelRun: false,
  canRetryRun: false,
};
const accounts = [
  {
    id: 5,
    displayName: "Test account",
    platform: "Facebook",
    expiredAt: "2026-11-01T00:00:00Z",
    isActive: true,
  },
];
// All bot schemas, selection records, and HTTP responses are test-only fixtures.
const config = {
  title: "Test runs",
  table: {
    caption: "Run history",
    columns: [{ key: "id", header: "ID", accessorKey: "id" }],
  },
  capabilities,
  startRun: {
    accountOptionsProvider: "accounts",
    description: "Configure this test run.",
    form: {
      schema: z.object({
        account: z.string().min(1),
        term: z.string().trim().min(1, "Enter a term."),
      }),
      fields: [
        {
          name: "account",
          label: "Account",
          type: "select",
          optionsProvider: "accounts",
        },
        { name: "term", label: "Search term", type: "text", required: true },
      ],
      defaultValues: { account: "5", term: "Initial term" },
    },
    resolveSelection: (values) => ({
      connectedAccountId: Number(values.account),
    }),
    serializeInfoJson: (values) => JSON.stringify({ testSearch: values.term }),
  },
};
const options = {
  accounts: { items: [{ value: "5", label: "Test account" }] },
};
function mount(props = {}) {
  // Retry enabled globally proves this write still opts out explicitly.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: 3, retryDelay: 0 },
    },
  });
  clients.push(client);
  const page = (overrides = {}) =>
    h(
      QueryClientProvider,
      { client },
      h(GenericRunsPage, {
        botId: "1",
        config,
        options,
        ...props,
        ...overrides,
      }),
    );
  const view = render(page());
  return { ...view, update: (overrides) => view.rerender(page(overrides)) };
}
async function openModal() {
  await waitFor(() =>
    assert.equal(
      screen.getByRole("button", { name: "Start run" }).disabled,
      false,
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Start run" }));
  return screen.findByRole("dialog", { name: "Start run" });
}
function submit() {
  fireEvent.submit(screen.getByRole("form", { name: "Start run" }));
}

test("create service sends the exact documented DTO with cookie credentials and returns an ID", async () => {
  const dto = {
    botId: 1,
    connectedAccountId: 5,
    targetGroupId: null,
    infoJson: '{"module":"test"}',
  };
  let calls = 0;
  api.defaults.adapter = async (request) => {
    calls += 1;
    assert.equal(request.url, "/api/v1/runs");
    assert.equal(request.method, "post");
    assert.equal(request.withCredentials, true);
    assert.equal(request.headers.has("Authorization"), false);
    assert.deepEqual(JSON.parse(request.data), dto);
    return success(request);
  };
  assert.equal(await RunsService.createRun(dto), 42);
  assert.equal(calls, 1);
  assert.equal(Object.hasOwn(RunsService, "retryRun"), false);
});

test("invalid envelopes and non-integer/null run IDs never report success", async () => {
  for (const data of [null, "42", 0, -1, 1.5, 2_147_483_648]) {
    api.defaults.adapter = async (request) => success(request, data);
    await assert.rejects(
      RunsService.createRun({
        botId: 1,
        connectedAccountId: 5,
        infoJson: "{}",
      }),
      (error) => /valid run ID/.test(error.message),
    );
  }
  api.defaults.adapter = async (request) => ({
    ...success(request),
    data: { data: 42 },
  });
  await assert.rejects(
    RunsService.createRun({ botId: 1, connectedAccountId: 5, infoJson: "{}" }),
  );
});

test("feature selection and serializer receive parsed values and route context without metadata rewriting", async () => {
  const calls = [];
  const values = { account: "5", term: "test" };
  const dto = await createRunAdapter(
    "12",
    values,
    {
      ...config.startRun,
      resolveSelection: async (...args) => {
        calls.push(args);
        return { connectedAccountId: 5, targetGroupId: 3 };
      },
      serializeInfoJson: (...args) => {
        calls.push(args);
        return ' { "differentSchema": [1, 2] } ';
      },
    },
    accounts,
  );
  assert.deepEqual(dto, {
    botId: 12,
    connectedAccountId: 5,
    targetGroupId: 3,
    infoJson: ' { "differentSchema": [1, 2] } ',
  });
  assert.deepEqual(calls, [
    [values, { botId: 12 }],
    [values, { botId: 12 }],
  ]);
  const empty = await createRunAdapter(
    "1",
    values,
    { ...config.startRun, serializeInfoJson: undefined },
    accounts,
  );
  assert.equal(empty.infoJson, "{}");
  assert.equal(Object.hasOwn(empty, "targetGroupId"), false);
});

test("selections outside eligible response and invalid IDs block DTO conversion", async () => {
  for (const connectedAccountId of [0, 99]) {
    await assert.rejects(
      createRunAdapter(
        "1",
        {},
        {
          ...config.startRun,
          resolveSelection: () => ({ connectedAccountId }),
        },
        accounts,
      ),
      (error) => /account/i.test(error.message),
    );
  }
  for (const id of ["", "abc", "1e2", "1.5", "-1", "0", "2147483648"]) {
    await assert.rejects(
      createRunAdapter(id, {}, config.startRun, accounts),
      (error) => /bot ID/.test(error.message),
    );
  }
  await assert.rejects(
    createRunAdapter(
      "1",
      {},
      {
        ...config.startRun,
        resolveSelection: () => ({ connectedAccountId: 5, targetGroupId: -3 }),
      },
      accounts,
    ),
    (error) => /target group/.test(error.message),
  );
});

test("a module can disable history without sending list/detail requests", async () => {
  let requests = 0;
  api.defaults.adapter = async () => {
    requests += 1;
    throw new Error("Unexpected request");
  };
  mount({
    config: {
      ...config,
      capabilities: { ...capabilities, canCreateRun: false },
    },
  });
  assert.ok(screen.getByText("Run history is disabled for this module."));
  assert.equal(screen.queryByRole("table"), null);
  assert.equal(screen.queryByRole("button", { name: /cancel|retry/i }), null);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  assert.equal(requests, 0);
});

test("capability, absent form, and feature readiness each disable creation with an explanation", () => {
  const view = mount({
    config: {
      ...config,
      capabilities: { ...capabilities, canCreateRun: false },
      startUnavailableReason: "Module cannot start runs.",
    },
  });
  assert.equal(
    screen.getByRole("button", { name: "Start run" }).disabled,
    true,
  );
  assert.ok(screen.getByText("Module cannot start runs."));
  view.update({ config: { ...config, startRun: undefined } });
  assert.equal(
    screen.getByRole("button", { name: "Start run" }).disabled,
    true,
  );
  view.update({
    config,
    startDisabledReason: "Module configuration is not ready.",
  });
  assert.equal(
    screen.getByRole("button", { name: "Start run" }).disabled,
    true,
  );
  assert.ok(screen.getByText("Module configuration is not ready."));
});

test("starting a run validates and serializes the form, closes the modal, and shows only acknowledgment", async () => {
  const requests = [];
  api.defaults.adapter = async (request) => {
    requests.push(request);
    return success(request);
  };
  mount();
  await openModal();
  fireEvent.change(screen.getByRole("textbox", { name: "Search term" }), {
    target: { value: "  Parsed term  " },
  });
  submit();
  await waitFor(() => assert.ok(screen.getByRole("status")));
  assert.equal(screen.queryByRole("dialog"), null);
  assert.match(
    screen.getByRole("status").textContent,
    /Run #42 started successfully/,
  );
  assert.deepEqual(JSON.parse(requests[0].data), {
    botId: 1,
    connectedAccountId: 5,
    infoJson: '{"testSearch":"Parsed term"}',
  });
  assert.equal(requests.length, 1);
  assert.equal(screen.queryByRole("table"), null);
  await openModal();
  assert.equal(
    screen.getByRole("textbox", { name: "Search term" }).value,
    "Initial term",
  );
});

for (const [status, message, guidance] of [
  [
    429,
    "Bot is on cooldown. Next run available in 12 minutes.",
    /Wait for the current run or cooldown/,
  ],
  [
    429,
    "The previous run is still in progress.",
    /Wait for the current run or cooldown/,
  ],
  [
    422,
    "Account is currently Busy and cannot be used.",
    /choose an Active connected account/,
  ],
  [400, "Validation failed.", /Review your inputs/],
  [404, "Bot not owned.", /Check your access/],
]) {
  test(`${status}: ${message} retains input and gives guidance without automatic retries`, async () => {
    let calls = 0;
    api.defaults.adapter = async (request) => {
      calls += 1;
      throw failure(request, status, message);
    };
    mount();
    await openModal();
    fireEvent.change(screen.getByRole("textbox", { name: "Search term" }), {
      target: { value: "Retained" },
    });
    submit();
    const alert = await screen.findByRole("alert");
    assert.ok(alert.textContent.includes(message));
    assert.match(alert.textContent, guidance);
    assert.equal(
      screen.getByRole("textbox", { name: "Search term" }).value,
      "Retained",
    );
    assert.ok(screen.getByRole("dialog"));
    assert.equal(screen.queryByRole("status"), null);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    assert.equal(calls, 1);
    api.defaults.adapter = async (request) => {
      calls += 1;
      return success(request);
    };
    submit();
    await waitFor(() =>
      assert.equal(screen.queryByRole("dialog") === null, true),
    );
    assert.equal(calls, 2);
  });
}

test("rapid submissions cannot duplicate a write and pending requests block dismissal", async () => {
  let finish,
    calls = 0;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  api.defaults.adapter = async (request) => {
    calls += 1;
    await pending;
    return success(request);
  };
  mount();
  await openModal();
  submit();
  submit();
  await waitFor(() => assert.equal(calls, 1));
  assert.equal(screen.getByRole("button", { name: "Cancel" }).disabled, true);
  assert.equal(
    screen.getByRole("button", { name: "Close dialog" }).disabled,
    true,
  );
  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  assert.ok(screen.getByRole("dialog"));
  await act(async () => {
    finish();
    await pending;
  });
  await waitFor(() =>
    assert.equal(screen.queryByRole("dialog") === null, true),
  );
  assert.equal(calls, 1);
});

test("a late creation response cannot acknowledge a run in another bot workspace", async () => {
  let finish,
    calls = 0;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  api.defaults.adapter = async (request) => {
    calls += 1;
    await pending;
    return success(request);
  };
  const view = mount();
  await openModal();
  submit();
  await waitFor(() => assert.equal(calls, 1));
  view.update({ botId: "2" });
  await act(async () => {
    finish();
    await pending;
  });
  assert.equal(screen.queryByRole("status"), null);
  assert.equal(screen.queryByRole("dialog"), null);
});

test("an empty eligible response disables start without calling the run API", async () => {
  let calls = 0;
  api.defaults.adapter = async (request) => {
    calls += 1;
    return success(request);
  };
  eligibleResponse = async (request) => {
    assert.equal(request.params.botId, 1);
    assert.equal(request.withCredentials, true);
    return success(request, []);
  };
  mount();
  await screen.findByText(
    "No eligible connected accounts are available for this bot.",
  );
  assert.equal(
    screen.getByRole("button", { name: "Start run" }).disabled,
    true,
  );
  assert.equal(calls, 0);
});

const runFixture = (overrides = {}) => ({
  id: 42,
  botId: 1,
  groupId: 3,
  accountId: 5,
  collectedLeadsCount: 7,
  infoJson: '{"testSearch":"term"}',
  startedAt: "2026-10-12T10:00:00Z",
  endedAt: null,
  status: "Running",
  ...overrides,
});
const historyConfig = {
  ...config,
  capabilities: {
    ...capabilities,
    canCreateRun: false,
    canListRuns: true,
    canGetRun: true,
    canCancelRun: true,
  },
  table: {
    ...config.table,
    columns: [
      ...config.table.columns,
      { key: "status", header: "Status", accessorKey: "status" },
    ],
  },
};
const runPage = (
  items,
  currentPage = 1,
  totalPages = 1,
  totalItems = items.length,
) => ({ items, currentPage, totalPages, totalItems });

test("run service list/detail/cancel use documented endpoints and reject malformed data", async () => {
  const requests = [];
  const filters = {
    botId: 1,
    pageNumber: 2,
    pageSize: 25,
    statusFilter: "Cancelled",
  };
  api.defaults.adapter = async (request) => {
    requests.push(request);
    if (request.url === "/api/v1/runs")
      return success(
        request,
        runPage([runFixture({ status: "Cancelled" })], 2, 2, 26),
      );
    if (request.url.endsWith("/cancel")) return success(request, true);
    return success(request, runFixture());
  };
  assert.equal(
    (await RunsService.getRuns(filters)).items[0].status,
    "Cancelled",
  );
  assert.equal((await RunsService.getRun(42)).id, 42);
  await RunsService.cancelRun(42);
  assert.deepEqual(
    requests.map((request) => [request.method, request.url]),
    [
      ["get", "/api/v1/runs"],
      ["get", "/api/v1/runs/42"],
      ["post", "/api/v1/runs/42/cancel"],
    ],
  );
  assert.deepEqual(requests[0].params, filters);
  assert.equal(requests[2].data, undefined);
  for (const request of requests) assert.equal(request.withCredentials, true);
  api.defaults.adapter = async (request) =>
    success(request, runFixture({ id: 99 }));
  await assert.rejects(RunsService.getRun(42), (error) =>
    /different run/.test(error.message),
  );
  api.defaults.adapter = async (request) =>
    success(request, runPage([runFixture({ status: "Unknown" })]));
  await assert.rejects(RunsService.getRuns());
  api.defaults.adapter = async (request) => success(request, false);
  await assert.rejects(RunsService.cancelRun(42));
});

test("history pagination, page size, and status filtering send server params and reset to page one", async () => {
  const filters = [];
  api.defaults.adapter = async (request) => {
    assert.equal(request.url, "/api/v1/runs");
    filters.push({ ...request.params });
    const page = request.params.pageNumber;
    return success(
      request,
      runPage(
        [
          runFixture({
            id: page,
            status: request.params.statusFilter ?? "Running",
          }),
        ],
        page,
        3,
        25,
      ),
    );
  };
  mount({ config: historyConfig });
  await screen.findByRole("button", { name: "Cancel run #1" });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("button", { name: "Cancel run #2" });
  fireEvent.change(screen.getByRole("combobox", { name: "Run status" }), {
    target: { value: "Cancelled" },
  });
  await screen.findByText("Cancelled", { selector: "td" });
  assert.deepEqual(filters.at(-1), {
    botId: 1,
    pageNumber: 1,
    pageSize: 10,
    statusFilter: "Cancelled",
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), {
    target: { value: "25" },
  });
  await waitFor(() => assert.equal(filters.at(-1).pageSize, 25));
  assert.equal(filters.at(-1).pageNumber, 1);
  assert.equal(screen.queryByRole("button", { name: /Cancel run/ }), null);
  assert.equal(screen.queryByRole("button", { name: /Retry run/ }), null);
});

test("only Running runs without an end time expose Cancel, and cancelled status comes from refetched data", async () => {
  let cancelled = false,
    writes = 0,
    reads = 0;
  api.defaults.adapter = async (request) => {
    assert.doesNotMatch(request.url, /retry/);
    if (request.url.endsWith("/cancel")) {
      assert.equal(request.url, "/api/v1/runs/42/cancel");
      writes += 1;
      cancelled = true;
      return success(request, true);
    }
    reads += 1;
    return success(
      request,
      runPage([
        runFixture(
          cancelled
            ? { status: "Cancelled", endedAt: "2026-10-12T11:00:00Z" }
            : {},
        ),
        ...["Pending", "Completed", "Failed", "Cancelled"].map(
          (status, index) => runFixture({ id: index + 1, status }),
        ),
        runFixture({ id: 6, endedAt: "2026-10-12T11:00:00Z" }),
      ]),
    );
  };
  mount({ config: historyConfig });
  const button = await screen.findByRole("button", { name: "Cancel run #42" });
  assert.equal(screen.getAllByRole("button", { name: /Cancel run/ }).length, 1);
  fireEvent.click(button);
  await waitFor(() =>
    assert.equal(
      screen.queryByRole("button", { name: /Cancel run/ }) === null,
      true,
    ),
  );
  assert.equal(writes, 1);
  assert.equal(reads, 2);
  assert.equal(screen.getAllByText("Cancelled", { selector: "td" }).length, 2);
});

test("details load on demand and refetch their final cancellation state", async () => {
  let cancelled = false;
  const urls = [];
  api.defaults.adapter = async (request) => {
    urls.push(request.url);
    const row = runFixture(
      cancelled ? { status: "Cancelled", endedAt: "2026-10-12T11:00:00Z" } : {},
    );
    if (request.url.endsWith("/cancel")) {
      cancelled = true;
      return success(request, true);
    }
    return success(
      request,
      request.url === "/api/v1/runs" ? runPage([row]) : row,
    );
  };
  mount({ config: historyConfig });
  fireEvent.click(await screen.findByRole("button", { name: "View run #42" }));
  await screen.findByText("Running", { selector: "dd" });
  assert.equal(urls.filter((url) => url === "/api/v1/runs/42").length, 1);
  fireEvent.click(screen.getByRole("button", { name: "Close details" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel run #42" }));
  await screen.findByText("Cancelled", { selector: "td" });
  fireEvent.click(screen.getByRole("button", { name: "View run #42" }));
  await screen.findByText("Cancelled", { selector: "dd" });
  assert.equal(urls.filter((url) => url === "/api/v1/runs/42").length, 2);
});

test("cancel prevents duplicate writes and explains server rejection without retries", async () => {
  let finish,
    writes = 0;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  api.defaults.adapter = async (request) => {
    if (request.url.endsWith("/cancel")) {
      writes += 1;
      await pending;
      throw failure(request, 400, "This run is already completed.");
    }
    return success(request, runPage([runFixture()]));
  };
  mount({ config: historyConfig });
  const button = await screen.findByRole("button", { name: "Cancel run #42" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => assert.equal(writes, 1));
  assert.equal(button.disabled, true);
  await act(async () => {
    finish();
    await pending;
  });
  await screen.findByText("This run is already completed.");
  assert.equal(writes, 1);
  assert.equal(screen.queryByText("Cancelled", { selector: "td" }), null);
});

test("create invalidates history and eligible accounts so the backend's busy account disappears", async () => {
  let created = false,
    eligibilityReads = 0;
  eligibleResponse = async (request) => {
    eligibilityReads += 1;
    return success(request, created ? [] : accounts);
  };
  api.defaults.adapter = async (request) => {
    if (request.method === "post") {
      created = true;
      return success(request);
    }
    return success(request, runPage(created ? [runFixture()] : []));
  };
  mount({
    config: {
      ...historyConfig,
      capabilities: { ...historyConfig.capabilities, canCreateRun: true },
    },
  });
  await openModal();
  submit();
  await screen.findByText("Run #42 started successfully.");
  await screen.findByText("Running", { selector: "td" });
  assert.equal(
    screen.getByRole("button", { name: "Start run" }).disabled,
    true,
  );
  assert.ok(
    screen.getByText(
      "No eligible connected accounts are available for this bot.",
    ),
  );
  assert.equal(eligibilityReads, 2);
});

test("eligible query failure disables start and a successful retry supplies account options", async () => {
  eligibleResponse = async (request) => {
    throw failure(request, 404, "Bot subscription not found.");
  };
  mount();
  await screen.findByText("Bot subscription not found.");
  assert.equal(
    screen.getByRole("button", { name: "Start run" }).disabled,
    true,
  );
  eligibleResponse = async (request) => success(request, accounts);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await openModal();
  assert.equal(
    screen.getByRole("combobox", { name: "Account" }).options[1].textContent,
    "Test account",
  );
});

test("eligible DTO validation requires expiredAt and never substitutes the old expiry property", async () => {
  eligibleResponse = async (request) => {
    assert.equal(request.method, "get");
    assert.equal(request.url, "/api/v1/connectedaccounts/eligible");
    assert.deepEqual(request.params, { botId: 1 });
    return success(request, accounts);
  };
  assert.deepEqual(
    await EligibleAccountsService.getEligibleAccounts(1),
    accounts,
  );
  eligibleResponse = async (request) =>
    success(request, [
      { ...accounts[0], expiredAt: undefined, expAt: accounts[0].expiredAt },
    ]);
  await assert.rejects(EligibleAccountsService.getEligibleAccounts(1));
});

test("typed registry wrappers preserve form transforms and reject unsupported retry/metadata contracts", () => {
  const project = fileURLToPath(
    new URL("../tsconfig.app.json", import.meta.url),
  );
  const loaded = ts.readConfigFile(project, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    loaded.config,
    ts.sys,
    fileURLToPath(new URL("../", import.meta.url)),
  );
  const program = ts.createProgram(
    [
      fileURLToPath(new URL("./runs.types.fixture.ts", import.meta.url)),
      fileURLToPath(new URL("../src/vite-env.d.ts", import.meta.url)),
    ],
    { ...parsed.options, tsBuildInfoFile: undefined },
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => "\n",
    }),
  );
});
