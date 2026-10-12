import { CircleAlert } from "lucide-react"

import type { UnsupportedBotModuleError } from "@/registry/botRegistry.errors"

/** An unsupported interface stays visible instead of opening an unrelated bot. */
export function UnsupportedBotModule({ error }: { error: UnsupportedBotModuleError }) {
  return (
    <section role="alert" className="rounded-2xl border bg-white px-6 py-14 text-center shadow-sm">
      <CircleAlert className="mx-auto size-8 text-amber-600" aria-hidden="true" />
      <h2 className="mt-5 text-lg font-semibold text-slate-950">Unsupported bot module</h2>
      <p className="mt-2 text-sm text-muted-foreground">This bot's interface is not supported by this application.</p>
      <p className="mt-2 text-sm text-muted-foreground">Module code: <code>{error.uiModuleCode}</code></p>
    </section>
  )
}
