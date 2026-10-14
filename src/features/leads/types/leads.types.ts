/** CamelCase wire fields from the LeadListDto supplied for Part 17. */
export interface LeadListDto {
  readonly leadId: number
  readonly leadFormattedId: string
  readonly profileName: string
  readonly profileUrl: string
  readonly aiMessage: string
  readonly fromGroup: string
  readonly status: string
  readonly createdAt: string
}

export interface LeadsListParams {
  readonly botId: number
  readonly pageNumber: number
  readonly pageSize: number
  // Status is a backend string, not a frontend-defined enum.
  readonly statusFilter?: string
}

/** Preview rows have a different display identifier and no group/date fields. */
export interface MessagingPreviewLeadDto {
  readonly leadId: number
  readonly leadNumber: string
  readonly profileName: string
  readonly profileUrl: string
  readonly aiMessage: string
  readonly status: string
}

export interface MessagingPreviewResponseDto {
  readonly dailyMessageLimit: number
  readonly messagesSent: number
  readonly allowedToProcessCount: number
  readonly leads: readonly MessagingPreviewLeadDto[]
}

/** Only the user-initiated dispatch endpoint accepts this browser request. */
export interface DispatchMessagingDto {
  readonly botId: number
  readonly accountId: number
  readonly leadIds: readonly number[]
}

export interface DispatchMessagingResultDto {
  readonly jobId: number
  readonly status: string
  readonly totalLeadsCount: number
}
