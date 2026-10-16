import assert from "node:assert/strict"
import { after, before, test } from "node:test"

import { House } from "lucide-react"
import { lazy } from "react"
import { createServer } from "vite"

let server, botModulesRegistry, resolveBotModule, UnsupportedBotModuleError, defineLeadsScraperModule, scraperRunsConfig
let postScraperModule, postScraperRunsConfig, postScraperRunSchema, postScraperRunAdapter
let ragModuleShell

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
  ;({ defineLeadsScraperModule } = await server.ssrLoadModule("/src/registry/definitions/leadsScraper.shared.ts"))
  ;({ scraperRunsConfig } = await server.ssrLoadModule("/src/registry/definitions/scraperModules.ts"))
  ;({ postScraperModule, postScraperRunsConfig } = await server.ssrLoadModule("/src/features/bot-modules/post-scraper/postScraper.module.ts"))
  ;({ postScraperRunSchema } = await server.ssrLoadModule("/src/features/bot-modules/post-scraper/postScraperRunSchema.ts"))
  ;({ postScraperRunAdapter } = await server.ssrLoadModule("/src/features/bot-modules/post-scraper/postScraperRunAdapter.ts"))
  ;({ ragModuleShell } = await server.ssrLoadModule("/src/features/bot-modules/customer-service-rag/rag.module.ts"))
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
    assert.deepEqual(module.sidebarTabs.map((tab) => tab.slug), ["runs", "connected-accounts", "groups", "leads", "messaging-preview"])
    assert.equal(module.sidebarTabs[0].config.capabilities.canRetryRun, false)
  }
  assert.ok(resolveBotModule("FB_LEADS_GEN") instanceof UnsupportedBotModuleError)
  assert.equal(Object.isFrozen(botModulesRegistry), true)
  assert.throws(() => { botModulesRegistry[definition.uiModuleCode] = definition }, TypeError)
  assert.ok(resolveBotModule(definition.uiModuleCode) instanceof UnsupportedBotModuleError)
})

test("shared composition omits unsupported tabs and direct resolution for every capability combination", () => {
  for (const supportsGroups of [false, true]) {
    for (const supportsLeads of [false, true]) {
      for (const supportsRuns of [false, true]) {
        const module = defineLeadsScraperModule({
          uiModuleCode: "TEST-ONLY-SCRAPER", supportsGroups, supportsLeads, supportsRuns,
          ...(supportsRuns ? { runsConfig: scraperRunsConfig } : {}),
        })
        const expected = [
          ...(supportsRuns ? ["runs"] : []), "connected-accounts",
          ...(supportsGroups ? ["groups"] : []),
          ...(supportsLeads ? ["leads", "messaging-preview"] : []),
        ]
        assert.deepEqual(module.sidebarTabs.map((tab) => tab.slug), expected)
        assert.deepEqual(module.scraperCapabilities, { supportsGroups, supportsLeads, supportsRuns })
        for (const slug of ["runs", "connected-accounts", "groups", "leads", "messaging-preview", "logs", "missing"]) {
          assert.equal(module.resolveComponent(slug), module.sidebarTabs.find((tab) => tab.slug === slug)?.component)
        }
        assert.deepEqual(Object.keys(module.pageConfigs), supportsRuns ? ["runs"] : [])
        if (supportsRuns) assert.equal(module.pageConfigs.runs, scraperRunsConfig)
        assert.equal(Object.isFrozen(module), true)
        assert.equal(Object.isFrozen(module.scraperCapabilities), true)
        assert.equal(Object.isFrozen(module.sidebarTabs), true)
        assert.equal(module.sidebarTabs.every(Object.isFrozen), true)
        assert.equal(Object.isFrozen(module.pageConfigs), true)
        // Building a definition must never install an example code globally.
        assert.ok(resolveBotModule(module.uiModuleCode) instanceof UnsupportedBotModuleError)
      }
    }
  }
})

test("each registered scraper selects its own creation form", () => {
  assert.equal(resolveBotModule("FB-POSTS-SCRAPER"), postScraperModule)
  assert.equal(postScraperModule.pageConfigs.runs, postScraperRunsConfig)
  assert.equal(postScraperModule.sidebarTabs.find((tab) => tab.slug === "runs").config, postScraperRunsConfig)
  const configs = Object.values(botModulesRegistry).map((module) => module.pageConfigs.runs)
  assert.equal(new Set(configs).size, 3)
  assert.equal(new Set(configs.map((config) => config.startRun.form.schema)).size, 3)
  for (const config of configs) {
    assert.equal(config.capabilities.canCreateRun, true)
    assert.equal(config.startUnavailableReason, undefined)
    assert.ok(config.startRun)
    assert.notEqual(config, scraperRunsConfig)
  }
  assert.ok(resolveBotModule("FB_POST_SCRAPER") instanceof UnsupportedBotModuleError)
  assert.equal(postScraperRunsConfig.capabilities.canListRuns, true)
  assert.equal(postScraperRunsConfig.capabilities.canGetRun, true)
  assert.equal(postScraperRunsConfig.capabilities.canCancelRun, true)
  assert.equal(postScraperRunsConfig.capabilities.canCreateRun, true)
  assert.equal(postScraperRunsConfig.startUnavailableReason, undefined)
  assert.ok(postScraperRunsConfig.startRun)
  assert.equal(scraperRunsConfig.startRun, undefined)
})

test("post scraper schema validates its custom fields and serializes only its metadata", () => {
  assert.equal(postScraperRunSchema.safeParse({ accountId: "12", searchTerm: "software", maxResults: 100 }).success, true)
  assert.equal(postScraperRunSchema.safeParse({ accountId: "", searchTerm: "software", maxResults: 100 }).success, false)
  assert.equal(postScraperRunAdapter.status, "ready")
  const { serializeInfoJson, extractInfoJson } = postScraperRunAdapter.adapter
  assert.equal(serializeInfoJson({ searchTerm: " software ", maxResults: 100 }), '{"searchTerm":"software","maxResults":100}')
  assert.deepEqual(extractInfoJson('{"searchTerm":"software","maxResults":100}'), { searchTerm: "software", maxResults: 100 })
  for (const historical of ["{}", "invalid", '{"keywords":["founder"]}', '{"searchTerm":"software","maxResults":100,"accountId":12}']) {
    assert.equal(extractInfoJson(historical), undefined)
  }
  assert.equal(Object.isFrozen(postScraperRunAdapter), true)
  assert.equal(Object.isFrozen(postScraperRunsConfig.table.columns), true)
})

test("RAG shell declares only conceptual pages and remains outside the production registry", () => {
  assert.equal("uiModuleCode" in ragModuleShell, false)
  assert.deepEqual(ragModuleShell.sidebarTabs.map((tab) => [tab.slug, tab.label]), [
    ["knowledge-base", "Knowledge Base"], ["conversations", "Conversations"],
    ["prompt-settings", "Prompt Settings"], ["playground", "Playground"],
  ])
  for (const tab of ragModuleShell.sidebarTabs) {
    assert.equal(ragModuleShell.resolveComponent(tab.slug), tab.component)
    assert.equal(Object.isFrozen(tab), true)
  }
  assert.equal(ragModuleShell.resolveComponent("unknown"), undefined)
  assert.equal(ragModuleShell.resolveComponent("runs"), undefined)
  assert.equal(Object.isFrozen(ragModuleShell), true)
  assert.equal(Object.isFrozen(ragModuleShell.sidebarTabs), true)
  assert.ok(resolveBotModule("CUSTOMER_SERVICE_RAG") instanceof UnsupportedBotModuleError)
  assert.deepEqual(Object.keys(botModulesRegistry), ["FB-MEMBERS-SCRAPER", "FB-POSTS-SCRAPER", "FB-MEMBERS-MESSAGES-SCRAPER"])
})
