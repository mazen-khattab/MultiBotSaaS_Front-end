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
  // Neither account list nor detail currently exposes status. Unknown status
  // must stay unknown; isActive is not evidence of the required Active status.
  readonly accountStatus: string | null
  readonly targetGroupId?: number | null
}

/** These literals prevent configuration from promising unsupported actions. */
export interface RunsCapabilities {
  readonly canCreateRun: boolean
  readonly canListRuns: false
  readonly canGetRun: false
  readonly canCancelRun: false
  readonly canRetryRun: false
}
