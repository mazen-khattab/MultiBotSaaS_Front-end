import { QueryClient } from "@tanstack/react-query"

import { queryDefaults } from "@/core/query/queryDefaults"

// A provider owns its client. Creating one here avoids a global mutable cache
// shared between unrelated sessions, while keeping defaults in one place.
export const createQueryClient = () => new QueryClient({ defaultOptions: queryDefaults })
