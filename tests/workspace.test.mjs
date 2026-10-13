import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";

import { House } from "lucide-react";
import { AxiosError } from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import React from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createServer } from "vite";

const h = React.createElement;
const user = {
  userId: "test-user",
  email: "user@example.com",
  name: "Test User",
  role: "User",
};
const auth = {
  user,
  realm: "user",
  status: "authenticated",
  loginUser: async () => user,
  loginAdmin: async () => user,
  refresh: async () => user,
  logout: async () => {},
};
const descriptor = {
  botId: "test-bot",
  name: "Test Workspace",
  uiModuleCode: "TEST_ONLY_MODULE",
};

let server, dom, mountedRouter, browserRouter, api, originalAdapter, httpCalls;
let AuthContext, BotWorkspaceLayout, useBotModule, BotsService, ClientBotsPage;
const clients = [];
let createBotWorkspaceLoader,
  botWorkspaceLoader,
  appRoutes,
  buildBotWorkspacePath,
  buildBotTabPath;
let render, renderHook, screen, cleanup, act, fireEvent, within, waitFor;
const originalGlobals = new Map();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:5173/login",
    pretendToBeVisual: true,
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    Element: dom.window.Element,
    SVGElement: dom.window.SVGElement,
    ShadowRoot: dom.window.ShadowRoot,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    MouseEvent: dom.window.MouseEvent,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  ({ render, renderHook, screen, cleanup, act, fireEvent, within, waitFor } =
    await import("@testing-library/react/pure.js"));
  // Inject test data only through the loader and registry interfaces. Exercise
  // the real layout, navigation, hook, and route page without replacing them.
  server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ AuthContext } = await server.ssrLoadModule(
    "/src/context/auth/AuthContext.tsx",
  ));
  ({ api } = await server.ssrLoadModule("/src/core/api/api.ts"));
  originalAdapter = api.defaults.adapter;
  ({ BotsService } = await server.ssrLoadModule("/src/features/bots/services/BotsService.ts"));
  ({ default: ClientBotsPage } = await server.ssrLoadModule("/src/features/client/pages/ClientBotsPage.tsx"));
  ({ default: BotWorkspaceLayout } = await server.ssrLoadModule(
    "/src/layouts/bot/BotWorkspaceLayout.tsx",
  ));
  ({ useBotModule } = await server.ssrLoadModule(
    "/src/features/bots/hooks/useBotModule.ts",
  ));
  ({ createBotWorkspaceLoader, botWorkspaceLoader } =
    await server.ssrLoadModule(
      "/src/features/bots/loaders/botWorkspaceLoader.ts",
    ));
  ({ buildBotWorkspacePath, buildBotTabPath } = await server.ssrLoadModule(
    "/src/app/router/routePaths.ts",
  ));
  ({ appRoutes, router: browserRouter } = await server.ssrLoadModule(
    "/src/app/router/router.tsx",
  ));
});

beforeEach(() => {
  window.history.replaceState(null, "", "/login");
  httpCalls = 0;
  api.defaults.adapter = async (config) => {
    httpCalls += 1;
    throw new Error(`Unexpected workspace request to ${config.url}`);
  };
});

afterEach(async () => {
  cleanup();
  mountedRouter?.dispose();
  mountedRouter = undefined;
  // Let Radix finish unmount work while DOM globals are still available.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  clients.splice(0).forEach((client) => client.clear());
});

after(async () => {
  if (api) api.defaults.adapter = originalAdapter;
  browserRouter?.dispose();
  await server?.close();
  dom?.window.close();
  for (const [key, value] of originalGlobals) {
    if (value) Object.defineProperty(globalThis, key, value);
    else delete globalThis[key];
  }
});

function TestPage({ botId, config }) {
  return h(
    "output",
    { "data-testid": "module-page" },
    JSON.stringify({ botId, config }),
  );
}

const fixture = (pendingModule) => {
  let pageLoads = 0;
  const component = React.lazy(() => {
    pageLoads += 1;
    return pendingModule ?? Promise.resolve({ default: TestPage });
  });
  const tabs = Object.freeze([
    Object.freeze({
      slug: "second",
      label: "Second tab",
      icon: House,
      component,
      config: Object.freeze({ title: "Second config" }),
    }),
    Object.freeze({
      slug: "first page",
      label: "First tab",
      icon: House,
      component,
      config: Object.freeze({ title: "First config" }),
    }),
  ]);
  const definition = Object.freeze({
    uiModuleCode: descriptor.uiModuleCode,
    sidebarTabs: tabs,
    resolveComponent: (slug) =>
      tabs.find((tab) => tab.slug === slug)?.component,
  });
  return {
    definition,
    registry: Object.freeze({ [definition.uiModuleCode]: definition }),
    pageLoads: () => pageLoads,
  };
};

const loaderArgs = () => ({
  params: { botId: descriptor.botId },
  request: new Request("http://localhost:5173/dashboard/bots/test-bot"),
  context: {},
});

const liveBot = {
  id: 73, name: "Backend test bot", description: null, currentPrice: 25,
  uiModuleCode: "FB-POSTS-SCRAPER", cooldownMinutes: 180, isActive: true,
  status: "Active", isSubscribed: true, subscribedAt: "2026-10-01T00:00:00Z",
};
const apiResponse = (config, data) => ({ config, status: 200, statusText: "OK", headers: {},
  data: { isSuccess: true, message: "", errorType: 0, data } });

const mount = (
  pathname,
  { registry, loadDescriptor = async () => descriptor, routes } = {},
) => {
  // Keep the real route hierarchy and guards. Override only the workspace's
  // retrieval boundary and registry, leaving tab and wildcard routes intact.
  const withTestWorkspace = (route) => {
    const copy = { ...route, children: route.children?.map(withTestWorkspace) };
    return route.path === "/dashboard/bots/:botId"
      ? {
          ...copy,
          lazy: undefined,
          loader: createBotWorkspaceLoader(loadDescriptor),
          element: h(BotWorkspaceLayout, { registry }),
        }
      : copy;
  };
  mountedRouter = createMemoryRouter(
    routes ?? appRoutes.map(withTestWorkspace),
    { initialEntries: [pathname] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(
    h(
      AuthContext.Provider,
      { value: auth },
      h(QueryClientProvider, { client }, h(RouterProvider, { router: mountedRouter })),
    ),
  );
};

test("default workspace loader retrieves owned BotDto and projects its actual module code", async () => {
  const args = { ...loaderArgs(), params: { botId: String(liveBot.id) } };
  api.defaults.adapter = async (config) => {
    httpCalls += 1;
    assert.equal(config.url, `/api/v1/bots/${liveBot.id}`);
    assert.equal(config.params.requireOwnership, true);
    assert.equal(config.withCredentials, true);
    return apiResponse(config, liveBot);
  };
  assert.deepEqual(await botWorkspaceLoader(args), {
    status: "ready", descriptor: { botId: String(liveBot.id), name: liveBot.name, uiModuleCode: liveBot.uiModuleCode },
  });
  assert.equal(httpCalls, 1);
  assert.deepEqual(await botWorkspaceLoader({ ...loaderArgs(), params: {} }), {
    status: "not-found",
  });
});

test("descriptor adapter receives the route ID and cancellation signal", async () => {
  const args = loaderArgs();
  let suppliedId, suppliedSignal;
  const loader = createBotWorkspaceLoader(async (botId, signal) => {
    suppliedId = botId;
    suppliedSignal = signal;
    return descriptor;
  });
  assert.deepEqual(await loader(args), { status: "ready", descriptor });
  assert.equal(suppliedId, descriptor.botId);
  assert.equal(suppliedSignal, args.request.signal);
});

test("missing and mismatched descriptors remain not found and adapter failures propagate", async () => {
  for (const supplied of [null, { ...descriptor, botId: "another-bot" }]) {
    assert.deepEqual(
      await createBotWorkspaceLoader(async () => supplied)(loaderArgs()),
      { status: "not-found" },
    );
  }
  const error = new Error("Test adapter failure");
  await assert.rejects(
    createBotWorkspaceLoader(async () => {
      throw error;
    })(loaderArgs()),
    (caught) => caught === error,
  );
});

test("useBotModule separates unavailable, unsupported, and ready descriptor states", () => {
  const { definition, registry, pageLoads } = fixture();
  const { result, rerender } = renderHook(
    ({ value }) => useBotModule(value, registry),
    { initialProps: { value: null } },
  );
  assert.equal(result.current.status, "unavailable");
  assert.deepEqual(result.current.tabs, []);
  rerender({ value: descriptor });
  assert.equal(result.current.status, "ready");
  assert.equal(result.current.module, definition);
  assert.equal(result.current.tabs, definition.sidebarTabs);
  rerender({
    value: { ...descriptor, uiModuleCode: "UNSUPPORTED_TEST_MODULE" },
  });
  assert.equal(result.current.status, "unsupported");
  assert.equal(result.current.error.uiModuleCode, "UNSUPPORTED_TEST_MODULE");
  assert.deepEqual(result.current.tabs, []);
  assert.equal(pageLoads(), 0);
});

test("real application home and Runs routes use backend module code instead of bot IDs", async () => {
  for (const pathname of [
    buildBotWorkspacePath(String(liveBot.id)),
    buildBotTabPath(String(liveBot.id), "runs"),
  ]) {
    api.defaults.adapter = async (config) => {
      if (config.url === `/api/v1/bots/${liveBot.id}`) return apiResponse(config, liveBot);
      assert.equal(config.url, "/api/v1/runs");
      assert.equal(config.params.botId, liveBot.id);
      return apiResponse(config, { items: [], totalItems: 0, totalPages: 0, currentPage: 1 });
    };
    mount(pathname, { routes: appRoutes });
    await screen.findByRole("link", { name: "Runs" });
    // The first lazy module compiles through Vite while other suites run too.
    if (pathname.endsWith("/runs")) await screen.findByText("No runs found", {}, { timeout: 5000 });
    else await screen.findByRole("heading", { name: "Workspace ready" });
    assert.equal(
      screen.getByRole("link", { name: "Home" }).getAttribute("href"),
      buildBotWorkspacePath(String(liveBot.id)),
    );
    assert.equal(screen.queryByTestId("module-page"), null);
    assert.equal(mountedRouter.state.location.pathname, pathname);
    cleanup();
    mountedRouter.dispose();
  }
});

test("real connected-accounts route loads the current bot's account list", async () => {
  const account = { id: 12, displayName: "Workspace account", platform: "Facebook", expiredAt: "2026-10-25T14:30:00Z", isActive: true };
  api.defaults.adapter = async (config) => {
    if (config.url === `/api/v1/bots/${liveBot.id}`) return apiResponse(config, liveBot);
    assert.equal(config.url, `/api/v1/connectedaccounts/${liveBot.id}`);
    assert.equal(config.params, undefined);
    return apiResponse(config, [account]);
  };
  mount(buildBotTabPath(String(liveBot.id), "connected-accounts"), { routes: appRoutes });
  await screen.findByText("Workspace account", {}, { timeout: 5000 });
  assert.equal(screen.getByRole("link", { name: "Connected accounts" }).getAttribute("aria-current"), "page");
});

test("real groups route loads an unfiltered user-wide list", async () => {
  api.defaults.adapter = async (config) => {
    if (config.url === `/api/v1/bots/${liveBot.id}`) return apiResponse(config, liveBot);
    assert.equal(config.url, "/api/v1/targetgroups");
    assert.equal(config.params, undefined);
    return apiResponse(config, [{ id: 5, groupName: "Workspace group", groupUrl: "https://example.test/group", isActive: true }]);
  };
  mount(buildBotTabPath(String(liveBot.id), "groups"), { routes: appRoutes });
  await screen.findByText("Workspace group", {}, { timeout: 5000 });
  assert.equal(screen.getByRole("link", { name: "Target groups" }).getAttribute("aria-current"), "page");
});

test("sidebar preserves registry order, encodes links, and opens only the selected tab", async () => {
  const data = fixture();
  const special = { ...descriptor, botId: "test /?#" };
  mount(buildBotWorkspacePath(special.botId), {
    registry: data.registry,
    loadDescriptor: async () => special,
  });
  await screen.findByRole("heading", { name: "Workspace ready" });
  const nav = within(
    screen.getByRole("navigation", { name: "Bot workspace navigation" }),
  );
  assert.deepEqual(
    nav.getAllByRole("link").map((link) => link.textContent),
    ["Home", "Second tab", "First tab"],
  );
  const tabLink = nav.getByRole("link", { name: "First tab" });
  assert.equal(
    tabLink.getAttribute("href"),
    buildBotTabPath(special.botId, "first page"),
  );
  assert.equal(data.pageLoads(), 0);
  fireEvent.click(tabLink);
  const page = await screen.findByTestId("module-page");
  assert.deepEqual(JSON.parse(page.textContent), {
    botId: special.botId,
    config: { title: "First config" },
  });
  assert.equal(data.pageLoads(), 1);
  assert.equal(
    screen
      .getByRole("link", { name: "First tab" })
      .getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    screen.getByRole("link", { name: "Home" }).hasAttribute("aria-current"),
    false,
  );
});

test("tab changes render the correct configuration without retrieving the descriptor again", async () => {
  const data = fixture();
  let retrievals = 0;
  mount(buildBotTabPath(descriptor.botId, "second"), {
    registry: data.registry,
    loadDescriptor: async () => {
      retrievals += 1;
      return descriptor;
    },
  });
  await screen.findByTestId("module-page");
  assert.equal(
    JSON.parse(screen.getByTestId("module-page").textContent).config.title,
    "Second config",
  );
  fireEvent.click(screen.getByRole("link", { name: "First tab" }));
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal(
    JSON.parse(screen.getByTestId("module-page").textContent).config.title,
    "First config",
  );
  assert.equal(retrievals, 1);
});

test("unknown slugs and nested paths stay in the workspace without invoking a fallback resolver", async () => {
  const data = fixture();
  const fallbackDefinition = {
    ...data.definition,
    resolveComponent: () => {
      throw new Error("Unknown tabs must not resolve");
    },
  };
  const registry = Object.freeze({
    [descriptor.uiModuleCode]: fallbackDefinition,
  });
  for (const suffix of [
    "missing",
    "toString",
    "first%20Page",
    "second/extra",
  ]) {
    const pathname = `${buildBotWorkspacePath(descriptor.botId)}/${suffix}`;
    mount(pathname, { registry });
    await screen.findByRole("heading", { name: "Workspace page not found" });
    assert.ok(
      screen.getByRole("navigation", { name: "Bot workspace navigation" }),
    );
    assert.equal(mountedRouter.state.location.pathname, pathname);
    assert.equal(screen.queryByTestId("module-page"), null);
    assert.equal(data.pageLoads(), 0);
    cleanup();
    mountedRouter.dispose();
  }
});

test("a registered tab without a resolved component shows workspace not found", async () => {
  const data = fixture();
  const definition = { ...data.definition, resolveComponent: () => undefined };
  mount(buildBotTabPath(descriptor.botId, "second"), {
    registry: Object.freeze({ [descriptor.uiModuleCode]: definition }),
  });
  await screen.findByRole("heading", { name: "Workspace page not found" });
  assert.equal(data.pageLoads(), 0);
});

test("unsupported module codes expose the code and never render dynamic tabs", async () => {
  const data = fixture();
  mount(buildBotTabPath(descriptor.botId, "second"), {
    registry: data.registry,
    loadDescriptor: async () => ({
      ...descriptor,
      uiModuleCode: "UNSUPPORTED_TEST_MODULE",
    }),
  });
  await screen.findByRole("heading", { name: "Unsupported bot module" });
  assert.ok(screen.getByText("UNSUPPORTED_TEST_MODULE"));
  assert.equal(screen.queryByRole("link", { name: "Second tab" }), null);
  assert.equal(screen.queryByTestId("module-page"), null);
  assert.equal(data.pageLoads(), 0);
});

test("null and mismatched bot retrieval keep all module pages closed", async () => {
  const data = fixture();
  for (const supplied of [null, { ...descriptor, botId: "another-bot" }]) {
    mount(buildBotTabPath(descriptor.botId, "second"), {
      registry: data.registry,
      loadDescriptor: async () => supplied,
    });
    await screen.findByRole("heading", { name: "Workspace page not found" });
    assert.equal(screen.queryByRole("link", { name: "Second tab" }), null);
    assert.equal(data.pageLoads(), 0);
    cleanup();
    mountedRouter.dispose();
  }
});

test("pending lazy pages show local loading while workspace navigation remains available", async () => {
  let finishLoading;
  const pending = new Promise((resolve) => {
    finishLoading = resolve;
  });
  const data = fixture(pending);
  mount(buildBotTabPath(descriptor.botId, "second"), {
    registry: data.registry,
  });
  await screen.findByText("Loading Second tab…");
  assert.ok(screen.getByRole("link", { name: "Home" }));
  await act(async () => {
    finishLoading({ default: TestPage });
    await pending;
  });
  await screen.findByTestId("module-page");
  assert.equal(screen.queryByText("Loading Second tab…"), null);
});

test("changing bots retrieves fresh context rather than retaining the previous bot ID", async () => {
  const data = fixture();
  mount(buildBotTabPath(descriptor.botId, "second"), {
    registry: data.registry,
    loadDescriptor: async (botId) => ({
      ...descriptor,
      botId,
      name: `Test workspace ${botId}`,
    }),
  });
  await screen.findByTestId("module-page");
  await act(async () => {
    await mountedRouter.navigate(buildBotTabPath("next-test-bot", "second"));
  });
  assert.equal(
    JSON.parse(screen.getByTestId("module-page").textContent).botId,
    "next-test-bot",
  );
  assert.equal(
    screen.getByRole("link", { name: "Home" }).getAttribute("href"),
    buildBotWorkspacePath("next-test-bot"),
  );
});

test("Bot services use real catalog, subscriptions, and ownership params without guessing module codes", async () => {
  const calls = [];
  api.defaults.adapter = async (config) => {
    calls.push(config);
    assert.equal(config.withCredentials, true);
    assert.equal(config.headers.has("Authorization"), false);
    return apiResponse(config, config.url === "/api/v1/bots" || config.url.endsWith("/subscribed") ? [liveBot] : liveBot);
  };
  assert.deepEqual(await BotsService.getBots(), [liveBot]);
  assert.deepEqual(await BotsService.getSubscribedBots(), [liveBot]);
  assert.equal((await BotsService.getBot(73, false)).uiModuleCode, "FB-POSTS-SCRAPER");
  await BotsService.getBot(73, true);
  assert.deepEqual(calls.map((call) => call.url), ["/api/v1/bots", "/api/v1/bots/subscribed", "/api/v1/bots/73", "/api/v1/bots/73"]);
  assert.equal(calls[2].params.requireOwnership, false);
  assert.equal(calls[3].params.requireOwnership, true);
});

test("owned workspace retrieval handles 404, unsubscribed, mismatched and unknown bot data", async () => {
  const args = { ...loaderArgs(), params: { botId: "73" } };
  for (const data of [{ ...liveBot, isSubscribed: false }, { ...liveBot, id: 74 }]) {
    api.defaults.adapter = async (config) => apiResponse(config, data);
    assert.deepEqual(await botWorkspaceLoader(args), { status: "not-found" });
  }
  api.defaults.adapter = async (config) => { throw new AxiosError("Not found", AxiosError.ERR_BAD_RESPONSE, config, undefined, {
    config, status: 404, statusText: "Not Found", headers: {},
    data: { isSuccess: false, statusCode: 404, message: "Bot not found or not owned.", path: config.url, method: "GET", traceId: "test" },
  }); };
  assert.deepEqual(await botWorkspaceLoader(args), { status: "not-found" });
  api.defaults.adapter = async (config) => apiResponse(config, { ...liveBot, uiModuleCode: "UNSUPPORTED_TEST_MODULE" });
  mount(buildBotWorkspacePath("73"), { routes: appRoutes });
  await screen.findByText("UNSUPPORTED_TEST_MODULE");
  assert.equal(screen.queryByRole("link", { name: "Runs" }), null);
});

test("subscribed bots and catalog load independently and only subscribed bots link to workspaces", async () => {
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/bots/subscribed") return apiResponse(config, [liveBot]);
    assert.equal(config.url, "/api/v1/bots");
    return apiResponse(config, [{ ...liveBot, id: 74, name: "Catalog bot", isSubscribed: false, subscribedAt: null }]);
  };
  mount("/dashboard/bots", { routes: [{ path: "/dashboard/bots", element: h(ClientBotsPage) }] });
  await screen.findByRole("heading", { name: liveBot.name });
  await screen.findByRole("heading", { name: "Catalog bot" });
  assert.equal(screen.getAllByRole("link", { name: "Open workspace" }).length, 1);
  assert.equal(screen.getByRole("link", { name: "Open workspace" }).getAttribute("href"), buildBotWorkspacePath("73"));
  assert.ok(screen.getByText("Subscription required"));
});

test("empty bot lists render empty states rather than obsolete backend blockers", async () => {
  api.defaults.adapter = async (config) => apiResponse(config, []);
  mount("/dashboard/bots", { routes: [{ path: "/dashboard/bots", element: h(ClientBotsPage) }] });
  await screen.findByText("You have no subscribed bots.");
  await screen.findByText("No bots are available.");
  await waitFor(() => assert.equal(screen.queryByRole("status") === null, true));
});
