import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"

/** Run a feature-owned operation without putting passwords in mutation variables.
 * Reconcile reads even after a lost response; never automatically retry a write. */
export function useAdminWrite() {
  const client = useQueryClient()
  const operation = useRef<(() => Promise<unknown>) | null>(null)
  const locked = useRef(false)
  const mutation = useMutation({
    retry: false, gcTime: 0,
    mutationFn: async () => { await operation.current?.() },
    onSettled: async () => {
      // User/bot display fields also appear in assignment reads. Invalidation
      // refreshes these related projections without guessing their new values.
      await client.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })

  async function run(write: () => Promise<unknown>) {
    if (locked.current) throw normalizeApiError({ message: "A management request is already in progress." })
    locked.current = true
    operation.current = write
    try { await mutation.mutateAsync() }
    finally { operation.current = null; locked.current = false; mutation.reset() }
  }
  return { run, isPending: mutation.isPending }
}
