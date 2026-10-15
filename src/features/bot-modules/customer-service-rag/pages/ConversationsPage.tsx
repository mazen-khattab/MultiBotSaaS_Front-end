import { MessagesSquare } from "lucide-react"

import { capabilityStatusLabels, frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** No empty history or sample messages imply a successful backend read. */
export default function ConversationsPage() {
  return (
    <ComingSoonState icon={MessagesSquare} title="Conversations unavailable"
      description={frontendCapabilities.ragConversations.description}
      statusLabel={capabilityStatusLabels[frontendCapabilities.ragConversations.status]} />
  )
}
