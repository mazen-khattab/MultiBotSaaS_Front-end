import { MessagesSquare } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** No empty history or sample messages imply a successful backend read. */
export default function ConversationsPage() {
  return (
    <ComingSoonState icon={MessagesSquare} title="Conversations unavailable"
      description="Conversation history and messages are unavailable until backend support is added." />
  )
}
