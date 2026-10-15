import { SlidersHorizontal } from "lucide-react"

import { capabilityStatusLabels, frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** Keep prompt editing and persistence unavailable while their contract is absent. */
export default function PromptSettingsPage() {
  return (
    <ComingSoonState icon={SlidersHorizontal} title="Prompt Settings unavailable"
      description={frontendCapabilities.ragPromptSettings.description}
      statusLabel={capabilityStatusLabels[frontendCapabilities.ragPromptSettings.status]} />
  )
}
