import { NavLink } from "react-router-dom"

import { cn } from "@/shared/lib/utils"
import type { NavigationItemDefinition } from "@/shared/types/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface NavigationItemProps {
  item: NavigationItemDefinition
  onNavigate?: () => void
  collapsed?: boolean
}

export function NavigationItem({ item, onNavigate, collapsed = false }: NavigationItemProps) {
  const Icon = item.icon

  const content = item.disabled ? (
    <span
      aria-disabled="true"
      aria-label={collapsed ? item.title : undefined}
      className={cn(
        "flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      <span className={cn(collapsed && "sr-only")}>{item.title}</span>
      {item.badge ? (
        <span
          className={cn(
            "ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300",
            collapsed && "sr-only",
          )}
          aria-label={item.badge.ariaLabel}
        >
          {item.badge.label}
        </span>
      ) : null}
    </span>
  ) : (
    <NavLink
      to={item.href}
      end={item.end}
      onClick={onNavigate}
      aria-label={collapsed ? item.title : undefined}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          collapsed && "justify-center px-2",
          isActive && "bg-blue-500/15 text-blue-100 ring-1 ring-inset ring-blue-400/20",
        )
      }
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      <span className={cn(collapsed && "sr-only")}>{item.title}</span>
      {item.badge ? (
        <span
          className={cn(
            "ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300",
            collapsed && "sr-only",
          )}
          aria-label={item.badge.ariaLabel}
        >
          {item.badge.label}
        </span>
      ) : null}
    </NavLink>
  )

  if (!collapsed) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  )
}
