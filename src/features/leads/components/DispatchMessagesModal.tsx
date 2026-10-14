import { useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { z } from "zod"

import { normalizeApiError } from "@/core/api/apiError"
import { queryKeys } from "@/core/query/queryKeys"
import { toDispatchMessagingDto } from "@/features/leads/adapters/dispatchMessagingAdapter"
import { useDispatchMessages } from "@/features/leads/hooks/useDispatchMessages"
import { useMessagingAccounts } from "@/features/leads/hooks/useMessagingAccounts"
import type { DispatchMessagingResultDto, MessagingPreviewResponseDto } from "@/features/leads/types/leads.types"
import type { ConnectedAccountDto } from "@/features/runs/services/EligibleAccountsService"
import { DynamicModal } from "@/shared/components/dynamic-form/DynamicModal"
import type { DynamicFormConfig } from "@/shared/components/dynamic-form/dynamicForm.types"

const formConfig: DynamicFormConfig<{ accountId: string }> = {
  schema: z.object({ accountId: z.string().min(1, "Choose an eligible account.") }),
  fields: [{ name: "accountId", type: "select", label: "Connected account", placeholder: "Select an eligible account", optionsProvider: "accounts", required: true }],
  defaultValues: { accountId: "" },
}

/** Account eligibility is fetched only while this modal is mounted. */
export function DispatchMessagesModal({ botId, previewReady, previewUnavailableReason, onClose, onDispatched }: {
  readonly botId: number
  readonly previewReady: boolean
  readonly previewUnavailableReason?: string
  readonly onClose: () => void
  readonly onDispatched: (result: DispatchMessagingResultDto) => void
}) {
  const client = useQueryClient()
  const accounts = useMessagingAccounts(botId)
  const mutation = useDispatchMessages()
  const result = useRef<DispatchMessagingResultDto | undefined>(undefined)
  const accountKey = queryKeys.accounts.list({ botId, eligible: true })
  const accountError = accounts.error ? normalizeApiError(accounts.error).message : undefined
  const emptyAccounts = accounts.isSuccess && accounts.data.length === 0
  const accountReadPending = accounts.isPending || accounts.isFetching || !accounts.isFetchedAfterMount

  return (
    <DynamicModal open title="Send messages"
      description={previewUnavailableReason ?? "Choose an eligible connected account to send messages to the available leads."}
      config={formConfig} submitLabel="Send" submittingLabel="Submitting…"
      // Option errors block submission inside DynamicForm. Keep the form itself
      // enabled after reads settle so its Retry options button remains usable.
      disabled={!previewReady || accountReadPending}
      onOpenChange={(open) => { if (!open) onClose() }}
      options={{ accounts: {
        items: (accounts.data ?? []).map((account) => ({ value: String(account.id), label: account.displayName })),
        isLoading: accountReadPending,
        error: accountError ?? (emptyAccounts ? "No eligible connected accounts are available for this bot." : undefined),
        onRetry: () => { void accounts.refetch() },
      } }}
      onSubmit={async ({ accountId }) => {
        result.current = undefined
        try {
          // Async form validation may outlive a query update. Read the current
          // cache and refuse stale/error/in-flight data again at submission time.
          const previewKey = queryKeys.leads.messagingPreview(botId)
          const previewState = client.getQueryState(previewKey)
          const accountState = client.getQueryState(accountKey)
          const preview = client.getQueryData<MessagingPreviewResponseDto>(previewKey)
          const eligible = client.getQueryData<ConnectedAccountDto[]>(accountKey)
          if (!preview || !eligible || previewState?.status !== "success" || accountState?.status !== "success" ||
            previewState.fetchStatus !== "idle" || accountState.fetchStatus !== "idle" ||
            previewState.isInvalidated || accountState.isInvalidated) {
            return { status: "error", message: "Wait for the current preview and eligible accounts to finish loading, then try again." }
          }
          const dto = toDispatchMessagingDto(botId, Number(accountId), preview, eligible)
          result.current = await mutation.dispatch(dto)
          return { status: "success" }
        } catch (error: unknown) {
          return { status: "error", message: normalizeApiError(error).message }
        }
      }}
      onSuccess={() => { if (result.current) onDispatched(result.current) }} />
  )
}
