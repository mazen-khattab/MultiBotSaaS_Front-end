export interface ApiResponse<T> {
  isSuccess: true
  message: string
  errorType: number
  data: T | null
}

export interface ApiErrorResponse {
  isSuccess: false
  statusCode: number
  message: string
  path: string
  method: string
  traceId: string
  details?: string | null
  innerException?: string | null
}

export interface MessageOnlyErrorResponse {
  message: string
}

export interface PaginatedResult<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
}

