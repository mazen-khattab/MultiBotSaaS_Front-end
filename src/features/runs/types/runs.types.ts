/** The documented create payload; infoJson is already serialized by the module. */
export interface CreateRunDto {
  readonly botId: number
  readonly connectedAccountId: number
  readonly targetGroupId?: number | null
  readonly infoJson: string
}

/** Creation returns only an ID, not a run detail or a history record. */
export type CreateRunResult = number

export interface RunCreationContext {
  readonly botId: number
}

/** Feature adapters must resolve selections from their own account/group data. */
export interface RunSelection {
  readonly connectedAccountId: number
  readonly targetGroupId?: number | null
}

/** Retry stays unavailable until the backend defines its business semantics. */
export interface RunsCapabilities {
  readonly canCreateRun: boolean
  readonly canListRuns: boolean
  readonly canGetRun: boolean
  readonly canCancelRun: boolean
  readonly canRetryRun: false
}

/** Exact serialized run states, including the backend's final cancellation state. */
export const RUN_STATUSES = ["Pending", "Running", "Completed", "Failed", "Cancelled"] as const
export type RunStatus = typeof RUN_STATUSES[number]

export interface RunDto {
  readonly id: number
  readonly botId: number | null
  readonly groupId: number | null
  readonly accountId: number | null
  readonly collectedLeadsCount: number
  readonly infoJson: string
  readonly startedAt: string
  readonly endedAt: string | null
  readonly status: RunStatus
}

export interface RunsListParams {
  readonly botId?: number
  readonly pageNumber?: number
  readonly pageSize?: number
  readonly statusFilter?: RunStatus
}
