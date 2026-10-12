/** Exact execution statuses defined by the backend AccountStatus contract. */
export const ACCOUNT_STATUSES = ["Active", "Busy", "CoolingDown", "AccountFlagged", "Banned"] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/** Activation and execution status are separate backend fields. */
export interface ConnectedAccount {
  readonly id: number
  readonly displayName: string
  readonly platform: string
  readonly expiresAt: string
  readonly isActive: boolean
}

export interface ConnectedAccountDetails extends ConnectedAccount {
  // The documented detail response can omit status. Never infer it from isActive.
  readonly status?: AccountStatus
  readonly maskedCookies: string
  readonly relatedLeadsCount: number
  readonly runsCount: number
}

/** Cookie payloads exist only during a form submission and its HTTPS request. */
export interface CreateConnectedAccountInput {
  readonly botId: number
  readonly displayName: string
  readonly platform: string
  readonly cookiesPayload: string
}

export interface UpdateConnectedAccountInput {
  readonly displayName: string
  readonly cookiesPayload: string
  readonly isActive: boolean
  readonly platform: string
  readonly status: AccountStatus
}
