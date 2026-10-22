import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { useSidebar } from "@/shared/hooks/useSidebar"
import { Button } from "@/shared/ui/button"

export function DesktopSidebarTrigger() {
  const { desktopOpen, setDesktopOpen } = useSidebar()
  const label = desktopOpen ? "Collapse sidebar" : "Expand sidebar"
  const Icon = desktopOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="hidden shrink-0 md:inline-flex"
      onClick={() => setDesktopOpen(!desktopOpen)}
      aria-label={label}
      title={label}
      aria-expanded={desktopOpen}
      aria-controls="desktop-navigation"
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  )
}
