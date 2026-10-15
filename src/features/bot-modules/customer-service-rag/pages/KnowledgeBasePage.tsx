import { BookOpen } from "lucide-react"

import { capabilityStatusLabels, frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** Explain the missing storage/upload/indexing backend without file controls. */
export default function KnowledgeBasePage() {
  return (
    <ComingSoonState icon={BookOpen} title="Knowledge Base unavailable"
      description={frontendCapabilities.ragKnowledgeBase.description}
      statusLabel={capabilityStatusLabels[frontendCapabilities.ragKnowledgeBase.status]} />
  )
}
