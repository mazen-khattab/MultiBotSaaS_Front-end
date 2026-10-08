import type { LucideIcon } from "lucide-react"

export interface NavigationItemDefinition {
  title: string
  href: string
  icon: LucideIcon
  end?: boolean
  disabled?: boolean
}

export interface NavigationGroupDefinition {
  label?: string
  items: readonly NavigationItemDefinition[]
}

