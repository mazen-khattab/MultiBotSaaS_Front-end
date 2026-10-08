import { Bot } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function ClientBotsPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Bots</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">My bots</h2>
      </div>
      <ComingSoonState
        icon={Bot}
        title="Bot discovery is waiting for its API"
        description="The backend contract does not currently expose a client bot or subscription list. The workspace route boundary is ready without inventing bot data."
      />
    </PageContainer>
  )
}

