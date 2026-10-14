import { normalizeApiError } from "@/core/api/apiError"
import type { DispatchMessagingDto, MessagingPreviewResponseDto } from "@/features/leads/types/leads.types"
import type { ConnectedAccountDto } from "@/features/runs/services/EligibleAccountsService"

/** Dispatch exactly the server preview; neither list filters nor local quotas select leads. */
export function toDispatchMessagingDto(
  botId: number,
  accountId: number,
  preview: MessagingPreviewResponseDto,
  accounts: readonly ConnectedAccountDto[],
): DispatchMessagingDto {
  if (preview.allowedToProcessCount <= 0 || preview.leads.length === 0) {
    throw normalizeApiError({ message: "No leads are currently available to send messages to. Refresh the preview before trying again." })
  }
  if (!accounts.some((account) => account.id === accountId)) {
    throw normalizeApiError({ message: "Choose an account from the current eligible accounts." })
  }
  return { botId, accountId, leadIds: preview.leads.map((lead) => lead.leadId) }
}
