export interface StructuredApiError {
  kind: "api"
  message: string
  statusCode: number
  path: string
  method: string
  traceId: string
  details?: string | null
  innerException?: string | null
}

export interface BareUnauthorizedError {
  kind: "unauthorized"
  message: string
  statusCode: 401
}

export interface SessionError {
  kind: "session"
  message: string
  statusCode: 401
}

export interface NetworkError {
  kind: "network"
  message: string
}

export interface UnknownError {
  kind: "unknown"
  message: string
  cause?: unknown
}

export type NormalizedApiError =
  | StructuredApiError
  | BareUnauthorizedError
  | SessionError
  | NetworkError
  | UnknownError

