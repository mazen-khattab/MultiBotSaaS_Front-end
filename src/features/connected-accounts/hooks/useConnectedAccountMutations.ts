import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { normalizeApiError, type NormalizedApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { ConnectedAccountsService } from "@/features/connected-accounts/services/ConnectedAccountsService"
import type { CreateConnectedAccountInput, UpdateConnectedAccountInput } from "@/features/connected-accounts/types/connectedAccounts.types"

type AccountWrite =
  | { operation: "create"; input: Omit<CreateConnectedAccountInput, "cookiesPayload"> }
  | { operation: "update"; id: number; input: Omit<UpdateConnectedAccountInput, "cookiesPayload"> }
  | { operation: "delete"; id: number }

/** Keep secrets out of mutation variables, results, errors, and Query caches. */
export function useConnectedAccountMutations() {
  const client = useQueryClient()
  const cookieForRequest = useRef<string | undefined>(undefined)
  const locked = useRef(false)
  const mutation = useMutation<void, NormalizedApiError, AccountWrite>({
    retry: false, gcTime: 0,
    mutationFn: async (write) => {
      const cookiesPayload = cookieForRequest.current ?? ""
      // Only the in-flight HTTP operation now owns the cookie payload.
      cookieForRequest.current = undefined
      if (write.operation === "create") await ConnectedAccountsService.create({ ...write.input, cookiesPayload })
      else if (write.operation === "update") await ConnectedAccountsService.update(write.id, { ...write.input, cookiesPayload })
      else await ConnectedAccountsService.delete(write.id)
    },
    onSettled: async (_data, _error, write) => {
      // A failed response can follow an applied write. Always reconcile reads,
      // including Part 14's server-owned eligibility rather than inferring it.
      // Deletion removes the account everywhere. This prefix also removes its
      // bot-scoped detail entries without requiring botId in the delete request.
      if (write.operation === "delete" && !_error) client.removeQueries({ queryKey: queryKeys.accounts.detail(write.id) })
      await client.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })

  async function submit(write: AccountWrite, cookiesPayload?: string) {
    if (locked.current) throw normalizeApiError({ message: "An account request is already in progress." })
    locked.current = true
    cookieForRequest.current = cookiesPayload
    try {
      await mutation.mutateAsync(write)
    } finally {
      cookieForRequest.current = undefined
      locked.current = false
      mutation.reset()
    }
  }

  return {
    isPending: mutation.isPending,
    create: ({ cookiesPayload, ...input }: CreateConnectedAccountInput) => submit({ operation: "create", input }, cookiesPayload),
    update: (id: number, { cookiesPayload, ...input }: UpdateConnectedAccountInput) => submit({ operation: "update", id, input }, cookiesPayload),
    delete: (id: number) => submit({ operation: "delete", id }),
  }
}
