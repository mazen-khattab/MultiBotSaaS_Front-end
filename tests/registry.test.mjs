import assert from "node:assert/strict"
import { after, before, test } from "node:test"

import { House } from "lucide-react"
import { lazy } from "react"
import { createServer } from "vite"

let server, botModulesRegistry, resolveBotModule, UnsupportedBotModuleError

before(async () => {
  // Load the real resolver through the same aliases as the application. Test
  // definitions stay in this file and never enter the production registry.
  server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  ;({ botModulesRegistry } = await server.ssrLoadModule("/src/registry/botModulesRegistry.ts"))
  ;({ resolveBotModule } = await server.ssrLoadModule("/src/registry/resolveBotModule.ts"))
  ;({ UnsupportedBotModuleError } = await server.ssrLoadModule("/src/registry/botRegistry.errors.ts"))
})

after(async () => { await server?.close() })

const fixture = () => {
  let pageLoads = 0
  const component = lazy(async () => {
    pageLoads += 1
    return { default: () => null }
  })
  const sidebarTabs = Object.freeze([
    Object.freeze({ slug: "home", label: "Home", icon: House, component }),
  ])
  const definition = Object.freeze({
    uiModuleCode: "TEST_ONLY_MODULE",
    sidebarTabs,
    resolveComponent: (slug) => sidebarTabs.find((tab) => tab.slug === slug)?.component,
  })
  return {
    definition,
    registry: Object.freeze({ [definition.uiModuleCode]: definition }),
    pageLoads: () => pageLoads,
  }
}

test("registered codes return the original definition without loading a page", () => {
  const { definition, registry, pageLoads } = fixture()
  const resolved = resolveBotModule(definition.uiModuleCode, registry)
  assert.equal(resolved, definition)
  assert.equal(resolved.resolveComponent("home"), definition.sidebarTabs[0].component)
  assert.equal(resolved.resolveComponent("missing-tab"), undefined)
  assert.equal(pageLoads(), 0)
})

test("unknown codes return a typed error instead of falling back to a registered module", () => {
  const { registry } = fixture()
  const result = resolveBotModule("MISSING_TEST_MODULE", registry)
  assert.ok(result instanceof UnsupportedBotModuleError)
  assert.ok(result instanceof Error)
  assert.equal(result.kind, "unsupported-module")
  assert.equal(result.uiModuleCode, "MISSING_TEST_MODULE")
})

test("resolution preserves exact case and whitespace and rejects empty codes", () => {
  const { definition, registry } = fixture()
  for (const code of [definition.uiModuleCode.toLowerCase(), ` ${definition.uiModuleCode}`, `${definition.uiModuleCode} `, ""]) {
    const result = resolveBotModule(code, registry)
    assert.ok(result instanceof UnsupportedBotModuleError)
    assert.equal(result.uiModuleCode, code)
  }
})

test("inherited object keys and inherited module definitions are unsupported", () => {
  const { definition, registry } = fixture()
  for (const code of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
    assert.ok(resolveBotModule(code, registry) instanceof UnsupportedBotModuleError)
  }
  const inheritedRegistry = Object.freeze(Object.create(registry))
  assert.ok(resolveBotModule(definition.uiModuleCode, inheritedRegistry) instanceof UnsupportedBotModuleError)
})

test("explicitly registered prototype-like strings are still exact module keys", () => {
  const { definition } = fixture()
  const explicitDefinition = Object.freeze({ ...definition, uiModuleCode: "__proto__" })
  const registry = Object.freeze(Object.fromEntries([[explicitDefinition.uiModuleCode, explicitDefinition]]))
  assert.equal(resolveBotModule("__proto__", registry), explicitDefinition)
})

test("the production registry contains only exact backend codes and remains immutable", () => {
  const { definition, registry } = fixture()
  resolveBotModule(definition.uiModuleCode, registry)
  assert.deepEqual(Object.keys(botModulesRegistry), ["FB-MEMBERS-SCRAPER", "FB-POSTS-SCRAPER", "FB-MEMBERS-MESSAGES-SCRAPER"])
  for (const code of Object.keys(botModulesRegistry)) {
    const module = resolveBotModule(code)
    assert.equal(module.uiModuleCode, code)
    assert.deepEqual(module.sidebarTabs.map((tab) => tab.slug), ["runs", "connected-accounts"])
    assert.equal(module.sidebarTabs[0].config.capabilities.canRetryRun, false)
  }
  assert.ok(resolveBotModule("FB_LEADS_GEN") instanceof UnsupportedBotModuleError)
  assert.equal(Object.isFrozen(botModulesRegistry), true)
  assert.throws(() => { botModulesRegistry[definition.uiModuleCode] = definition }, TypeError)
  assert.ok(resolveBotModule(definition.uiModuleCode) instanceof UnsupportedBotModuleError)
})
