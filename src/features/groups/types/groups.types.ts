/** Read endpoints provide bot scope; the response DTO does not need botId. */
export interface Group {
  readonly id: number
  readonly groupName: string
  readonly groupUrl: string
  readonly isActive: boolean
}

export interface GroupDetails extends Group {
  readonly configJson: string
  readonly relatedLeadsCount: number
  readonly runsCount: number
}

/** Configuration is serialized JSON, with business rules owned by the backend. */
export interface UpdateGroupInput {
  readonly groupName: string
  readonly groupUrl: string
  readonly configJson: string
  readonly isActive: boolean
}

export interface CreateGroupInput extends UpdateGroupInput {
  readonly botId: number
}
