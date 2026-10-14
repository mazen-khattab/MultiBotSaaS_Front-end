import { MessageCircle } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"

/** A static unavailable state avoids presenting simulated chat as a real service. */
export default function ChatPlaygroundPage() {
  return (
    <ComingSoonState icon={MessageCircle} title="Playground unavailable"
      description="Playground chat is unavailable until backend support is added." />
  )
}
