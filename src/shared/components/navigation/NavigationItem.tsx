import { NavLink } from "react-router-dom"

import { cn } from "@/shared/lib/utils"
import type { NavigationItemDefinition } from "@/shared/types/navigation"

interface NavigationItemProps {
  item: NavigationItemDefinition
  onNavigate?: () => void
}

export function NavigationItem({ item, onNavigate }: NavigationItemProps) {
  const Icon = item.icon

  if (item.disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500"
      >
        <Icon className="size-[18px]" aria-hidden="true" />
        {item.title}
      </span>
    )
  }

  return (
    <NavLink
      to={item.href}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          isActive && "bg-blue-500/15 text-blue-100 ring-1 ring-inset ring-blue-400/20",
        )
      }
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      {item.title}
    </NavLink>
  )
}

