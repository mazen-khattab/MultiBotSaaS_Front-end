import { SlidersHorizontal } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** Keep prompt editing and persistence unavailable while their contract is absent. */
export default function PromptSettingsPage() {
  return (
    <ComingSoonState icon={SlidersHorizontal} title="Prompt Settings unavailable"
      description="Prompt settings cannot be loaded or saved until backend support is added." />
  )
}
