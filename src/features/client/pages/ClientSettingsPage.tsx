import { Settings } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function ClientSettingsPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Preferences</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Settings</h2>
      </div>
      <ComingSoonState
        icon={Settings}
        title="Workspace settings are coming soon"
        description="Settings handlers exist in the backend, but no HTTP contract exposes them yet. This page remains an honest UI boundary until that contract is available."
      />
    </PageContainer>
  )
}

