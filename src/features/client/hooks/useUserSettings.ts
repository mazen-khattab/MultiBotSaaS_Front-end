import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { normalizeApiError, type NormalizedApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { UserSettingsService } from "@/features/client/services/UserSettingsService"
import type { UpdateUserSettingsDto } from "@/features/client/types/client.types"

export function useUserSettings() {
  return useQuery({ queryKey: queryKeys.settings.current, queryFn: ({ signal }) => UserSettingsService.get(signal) })
}

type Replacements = Pick<UpdateUserSettingsDto, "aiApiKey" | "scraperToken">
type PublicSettings = Omit<UpdateUserSettingsDto, keyof Replacements>

/** Match account writes: secrets never become mutation variables or cache data. */
export function useSaveUserSettings() {
  const client = useQueryClient()
  const replacements = useRef<Replacements>({})
  const locked = useRef(false)
  const mutation = useMutation<void, NormalizedApiError, PublicSettings>({
    retry: false, gcTime: 0,
    mutationFn: async (input) => {
      const secrets = replacements.current
      replacements.current = {}
      try { await UserSettingsService.update({ ...input, ...secrets }) }
      finally { delete secrets.aiApiKey; delete secrets.scraperToken }
    },
    onSuccess: async () => {
      // Refetch masks/settings after acknowledgment, plus any open quota reads.
      // Do not fabricate quota from the daily limit or a notification counter.
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.settings.current }),
        client.invalidateQueries({ queryKey: queryKeys.leads.all }),
      ])
    },
  })
  async function save({ aiApiKey, scraperToken, ...input }: UpdateUserSettingsDto) {
    if (locked.current) throw normalizeApiError({ message: "A settings request is already in progress." })
    locked.current = true
    replacements.current = { aiApiKey, scraperToken }
    try { await mutation.mutateAsync(input) }
    finally { replacements.current = {}; locked.current = false; mutation.reset() }
  }
  return { save, isPending: mutation.isPending }
}
