import { Construction } from "lucide-react"
import { useParams } from "react-router-dom"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function BotTabRoutePage() {
  const { tabSlug } = useParams<{ botId: string; tabSlug: string }>()

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

