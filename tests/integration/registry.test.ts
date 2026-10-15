import { expect, test } from "vitest"

import { UnsupportedBotModuleError } from "@/registry/botRegistry.errors"
import { resolveBotModule } from "@/registry/resolveBotModule"

test("a known exact code resolves its declared module and tabs", () => {
  const module = resolveBotModule("FB-MEMBERS-SCRAPER")
  expect(module).not.toBeInstanceOf(UnsupportedBotModuleError)
  if (module instanceof UnsupportedBotModuleError) throw module
  expect(module.uiModuleCode).toBe("FB-MEMBERS-SCRAPER")
  const tab = module.sidebarTabs[0]!
  expect(module.resolveComponent(tab.slug)).toBe(tab.component)
})
test.each(["UNKNOWN-CODE", "fb-members-scraper", " FB-MEMBERS-SCRAPER", "toString"])("unknown code %s stays unsupported", (code) => {
  expect(resolveBotModule(code)).toBeInstanceOf(UnsupportedBotModuleError)
})
test("an invalid tab never falls back to another component", () => {
  const module = resolveBotModule("FB-POSTS-SCRAPER")
  if (module instanceof UnsupportedBotModuleError) throw module
  expect(module.resolveComponent("not-a-tab")).toBeUndefined()
  expect(module.resolveComponent("runs/nested")).toBeUndefined()
})
