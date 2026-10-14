import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { GroupsService } from "@/features/groups/services/GroupsService"
import type { CreateGroupInput, UpdateGroupInput } from "@/features/groups/types/groups.types"

type GroupWrite =
  | { operation: "create"; input: CreateGroupInput }
  | { operation: "update"; id: number; input: UpdateGroupInput }
  | { operation: "delete"; id: number }

/** Reconcile server reads after writes without optimistic IDs or activation. */
export function useGroupMutations() {
  const client = useQueryClient()
  const locked = useRef(false)
  const mutation = useMutation({
    retry: false,
    mutationFn: async (write: GroupWrite) => {
      if (write.operation === "create") await GroupsService.create(write.input)
      else if (write.operation === "update") await GroupsService.update(write.id, write.input)
      else await GroupsService.delete(write.id)
    },
    onSettled: async (_data, error, write) => {
      // Deletion is still by group ID. Remove its details under every bot key.
      if (write.operation === "delete" && !error) client.removeQueries({ queryKey: queryKeys.groups.detail(write.id) })
      // A transport failure can follow an applied write. Reconcile on failure
      // too; the returned mutation data is never used as a detail cache key.
      await client.invalidateQueries({ queryKey: queryKeys.groups.all })
    },
  })

  async function submit(write: GroupWrite) {
    if (locked.current) throw normalizeApiError({ message: "A group request is already in progress." })
    locked.current = true
    try {
      await mutation.mutateAsync(write)
    } finally {
      locked.current = false
      mutation.reset()
    }
  }

  return {
    isPending: mutation.isPending,
    create: (input: CreateGroupInput) => submit({ operation: "create", input }),
    update: (id: number, input: UpdateGroupInput) => submit({ operation: "update", id, input }),
    delete: (id: number) => submit({ operation: "delete", id }),
  }
}
