import type { LucideIcon } from "lucide-react"

export interface NavigationItemDefinition {
  key: string
  title: string
  href: string
  icon: LucideIcon
  end?: boolean
  disabled?: boolean
  badge?: {
    label: string
    ariaLabel?: string
  }
}

export interface NavigationGroupDefinition {
  label?: string
  items: readonly NavigationItemDefinition[]
}
