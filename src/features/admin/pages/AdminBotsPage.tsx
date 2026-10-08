import { Bot } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function AdminBotsPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-violet-600">Management</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Bots</h2>
      </div>
      <ComingSoonState
        icon={Bot}
        title="Bot administration is coming soon"
        description="The backend does not yet provide admin bot management endpoints or documented UI module values. No behavior is simulated here."
      />
    </PageContainer>
  )
}

