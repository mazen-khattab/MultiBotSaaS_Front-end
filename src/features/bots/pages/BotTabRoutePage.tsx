import { CircleAlert, Construction } from "lucide-react"
import { useParams } from "react-router-dom"

import type { BotRouteParams } from "@/app/router/routeTypes"
import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function BotTabRoutePage() {
  const { botId, tabSlug } = useParams<keyof BotRouteParams>()

  if (!botId || !tabSlug) {
    return (
      <PageContainer>
        <section
          className="rounded-2xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm"
          role="alert"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <CircleAlert className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-slate-950">Invalid bot workspace route</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            A bot identifier and tab slug are both required to open a bot module.
          </p>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Bot module</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {tabSlug ? tabSlug.replaceAll("-", " ") : "Module"}
        </h2>
      </div>
      <ComingSoonState
        icon={Construction}
        title="Dynamic module resolution arrives in Part 3"
        description="The route captures the requested tab slug, but Part 1 intentionally does not guess UI module codes or bot-specific tabs."
      />
    </PageContainer>
  )
}
