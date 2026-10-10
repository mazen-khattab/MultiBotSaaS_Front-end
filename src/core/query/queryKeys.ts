// These are cache selectors, not backend DTOs or promises of existing endpoints.
// Include the relevant bot, page, search, and filter values in a feature's list
// key so different result sets cannot overwrite one another in the cache.
export type QueryKeyFilters = Readonly<Record<string, string | number | boolean | null | undefined>>

const createDomainKeys = <T extends string>(domain: T) => {
  const all = [domain] as const
  const lists = () => [...all, "list"] as const
  const details = () => [...all, "detail"] as const

  // Prefixes allow broad invalidation (all lists) or exact invalidation (one
  // filtered list/detail), without coupling the key factory to an HTTP service.
  return {
    all,
    lists,
    list: (filters: QueryKeyFilters = {}) => [...lists(), filters] as const,
    details,
    detail: (id: string | number) => [...details(), id] as const,
  }
}

export const queryKeys = {
  accounts: createDomainKeys("accounts"),
  groups: createDomainKeys("groups"),
  runs: createDomainKeys("runs"),
  leads: createDomainKeys("leads"),
  bots: createDomainKeys("bots"),
  admin: createDomainKeys("admin"),
} as const
