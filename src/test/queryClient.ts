import { QueryClient } from "@tanstack/react-query"

import { queryDefaults } from "@/core/query/queryDefaults"

const clients = new Set<QueryClient>()

/** Each render owns its cache. Tests opt into retries explicitly when needed. */
export function createTestQueryClient() {
  const client = new QueryClient({ defaultOptions: {
    queries: { ...queryDefaults.queries, retry: false, gcTime: Infinity },
    mutations: { ...queryDefaults.mutations, gcTime: Infinity },
  } })
  clients.add(client)
  return client
}

export function clearTestQueryClients() {
  for (const client of clients) client.clear()
  clients.clear()
}
