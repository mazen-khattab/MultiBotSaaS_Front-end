import { ChevronDown } from "lucide-react"

import { MobileSidebarTrigger } from "@/shared/components/layout/MobileSidebarTrigger"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"

interface DashboardHeaderProps {
  title: string
  description?: string
  accountLabel?: string
}

export function DashboardHeader({
  title,
  description,
  accountLabel = "Workspace user",
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileSidebarTrigger />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
            {title}
          </h1>
          {description ? (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
          ) : null}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 gap-2 px-2" aria-label="Open account menu">
            <Avatar>
              <AvatarFallback>MW</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{accountLabel}</span>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Profile available in Part 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

