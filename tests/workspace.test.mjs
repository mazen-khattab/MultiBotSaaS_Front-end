import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";

import { House } from "lucide-react";
import { JSDOM } from "jsdom";
import React from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createServer } from "vite";

const h = React.createElement;
const blockedTitle =
  "Bot workspace data unavailable until backend contract is exposed";
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
let AuthContext, BotWorkspaceLayout, useBotModule;
let createBotWorkspaceLoader,
  botWorkspaceLoader,
  appRoutes,
  buildBotWorkspacePath,
  buildBotTabPath;
let render, renderHook, screen, cleanup, act, fireEvent, within;
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
  ({ render, renderHook, screen, cleanup, act, fireEvent, within } =
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
  assert.equal(
    httpCalls,
    0,
    "Workspace composition must not invent an API request",
  );
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
  return render(
    h(
      AuthContext.Provider,
      { value: auth },
      h(RouterProvider, { router: mountedRouter }),
    ),
  );
};

test("default workspace loader reports blocked data without synthesizing a descriptor", async () => {
  assert.deepEqual(await botWorkspaceLoader(loaderArgs()), {
    status: "blocked",
  });
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

test("real application home and tab routes display the blocked state with Home navigation", async () => {
  for (const pathname of [
    buildBotWorkspacePath(descriptor.botId),
    buildBotTabPath(descriptor.botId, "second"),
  ]) {
    mount(pathname, { routes: appRoutes });
    await screen.findByRole("heading", { name: blockedTitle });
    assert.equal(
      screen.getByRole("link", { name: "Home" }).getAttribute("href"),
      buildBotWorkspacePath(descriptor.botId),
    );
    assert.equal(screen.queryByTestId("module-page"), null);
    assert.equal(mountedRouter.state.location.pathname, pathname);
    cleanup();
    mountedRouter.dispose();
  }
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
