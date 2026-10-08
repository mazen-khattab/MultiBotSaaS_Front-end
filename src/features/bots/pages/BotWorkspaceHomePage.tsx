import { Bot, Boxes, PlugZap } from "lucide-react"
import { useParams } from "react-router-dom"

import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function BotWorkspaceHomePage() {
  const { botId } = useParams<{ botId: string }>()

  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Bot workspace</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {botId ? `Bot ${botId}` : "Bot overview"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This workspace has its own shell, separate from the client dashboard navigation.
        </p>
      </div>

      <section className="grid overflow-hidden rounded-2xl border bg-white shadow-sm md:grid-cols-[0.8fr_1.2fr]">
        <div className="flex min-h-64 items-center justify-center bg-slate-950 p-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
            <span className="relative flex size-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-blue-300">
              <Bot className="size-11" aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-9">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Boxes className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-semibold text-slate-950">Module boundary ready</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Dynamic tabs, module resolution, and entitlement checks are deliberately deferred. They require the
            documented bot registry and backend capabilities from later parts.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-500">
            <PlugZap className="size-4" aria-hidden="true" />
            No network request is made by this page.
          </div>
        </div>
      </section>
    </PageContainer>
  )
}

