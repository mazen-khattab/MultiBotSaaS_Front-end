import { NavigationItem } from "@/shared/components/navigation/NavigationItem"
import { cn } from "@/shared/lib/utils"
import type { NavigationGroupDefinition } from "@/shared/types/navigation"

interface NavigationGroupProps {
  group: NavigationGroupDefinition
  onNavigate?: () => void
  collapsed?: boolean
}

export function NavigationGroup({ group, onNavigate, collapsed = false }: NavigationGroupProps) {
  return (
    <section className="space-y-2" aria-label={group.label}>
      {group.label ? (
        <h2
          className={cn(
            "px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500",
            collapsed && "sr-only",
          )}
        >
          {group.label}
        </h2>
      ) : null}
      <nav className="space-y-1" aria-label={group.label ?? "Primary navigation"}>
        {group.items.map((item) => (
          <NavigationItem
            key={item.key}
            item={item}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </section>
  )
}
