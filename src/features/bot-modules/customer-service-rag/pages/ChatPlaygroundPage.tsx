import { MessageCircle } from "lucide-react"

import { capabilityStatusLabels, frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** A static unavailable state avoids presenting simulated chat as a real service. */
export default function ChatPlaygroundPage() {
  return (
    <ComingSoonState icon={MessageCircle} title="Playground unavailable"
      description={frontendCapabilities.ragPlayground.description}
      statusLabel={capabilityStatusLabels[frontendCapabilities.ragPlayground.status]} />
  )
}
