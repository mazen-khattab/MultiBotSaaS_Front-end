import { Menu } from "lucide-react"

import { useSidebar } from "@/shared/hooks/useSidebar"
import { Button } from "@/shared/ui/button"

export function MobileSidebarTrigger() {
  const { setMobileOpen } = useSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={() => setMobileOpen(true)}
      aria-label="Open navigation"
    >
      <Menu className="size-5" aria-hidden="true" />
    </Button>
  )
}
