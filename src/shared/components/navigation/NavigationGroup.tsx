import { NavigationItem } from "@/shared/components/navigation/NavigationItem"
import type { NavigationGroupDefinition } from "@/shared/types/navigation"

interface NavigationGroupProps {
  group: NavigationGroupDefinition
  onNavigate?: () => void
}

export function NavigationGroup({ group, onNavigate }: NavigationGroupProps) {
  return (
    <section className="space-y-2" aria-label={group.label}>
      {group.label ? (
        <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {group.label}
        </h2>
      ) : null}
      <nav className="space-y-1" aria-label={group.label ?? "Primary navigation"}>
        {group.items.map((item) => (
          <NavigationItem key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </section>
  )
}

