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
    // Existing callers select by ID. Workspace reads can additionally scope
    // the key by bot while the ID-only key remains a useful invalidation prefix.
    detail: (idOrBotId: string | number, id?: string | number) => id === undefined
      ? [...details(), idOrBotId] as const
      : [...details(), id, idOrBotId] as const,
  }
}

const leadKeys = createDomainKeys("leads")

export const queryKeys = {
  accounts: createDomainKeys("accounts"),
  groups: createDomainKeys("groups"),
  runs: createDomainKeys("runs"),
  leads: {
    ...leadKeys,
    // Preview has a quota envelope, so it must not share a list/detail key.
    messagingPreview: (botId: number) => [...leadKeys.all, "messaging-preview", botId] as const,
  },
  bots: createDomainKeys("bots"),
  admin: createDomainKeys("admin"),
} as const
