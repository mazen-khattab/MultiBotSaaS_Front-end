import { BookOpen } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** Explain the missing storage/upload/indexing backend without file controls. */
export default function KnowledgeBasePage() {
  return (
    <ComingSoonState icon={BookOpen} title="Knowledge Base unavailable"
      description="Knowledge base storage, document uploads, and indexing are unavailable until backend support is added." />
  )
}
