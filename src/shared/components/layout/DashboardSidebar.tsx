import { Bot } from "lucide-react"
import type { ReactNode } from "react"

import { APP_NAME } from "@/core/constants/app"
import { NavigationGroup } from "@/shared/components/navigation/NavigationGroup"
import { cn } from "@/shared/lib/utils"
import type { NavigationGroupDefinition } from "@/shared/types/navigation"
import { Separator } from "@/shared/ui/separator"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/shared/ui/sidebar"

interface DashboardSidebarProps {
  navigation?: readonly NavigationGroupDefinition[]
  contextLabel: string
  contextTitle: string
  topContent?: ReactNode
  footer?: ReactNode
  onNavigate?: () => void
  collapsed?: boolean
}

export function DashboardSidebar({
  navigation = [],
  contextLabel,
  contextTitle,
  topContent,
  footer,
  onNavigate,
  collapsed = false,
}: DashboardSidebarProps) {
  return (
    <Sidebar className={cn("transition-[width] duration-200", collapsed && "w-20")}>
      <SidebarHeader>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/30">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div className={cn("min-w-0", collapsed && "sr-only")}>
            <p className="text-base font-bold tracking-tight text-white">{APP_NAME}</p>
            <p className="truncate text-xs text-slate-500">{contextLabel}</p>
          </div>
        </div>
      </SidebarHeader>
      <Separator className="bg-white/10" />
      <SidebarContent>
        <p
          className={cn(
            "mb-5 truncate px-3 text-sm font-semibold text-white",
            collapsed && "sr-only",
          )}
          title={contextTitle}
        >
          {contextTitle}
        </p>
        {topContent && !collapsed ? <div className="mb-5 px-3">{topContent}</div> : null}
        <div className="space-y-6">
          {navigation.map((group, index) => (
            <NavigationGroup
              key={group.label ?? `navigation-group-${index}`}
              group={group}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </div>
      </SidebarContent>
      {footer ? (
        <>
          <Separator className="bg-white/10" />
          <SidebarFooter className={cn(collapsed && "sr-only")}>{footer}</SidebarFooter>
        </>
      ) : null}
    </Sidebar>
  )
}
