import { AlertCircle, RotateCcw } from "lucide-react"

import { normalizeApiError } from "@/core/api/apiError"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

interface ApiErrorAlertProps {
  error: unknown
  title?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

export function ApiErrorAlert({
  error,
  title = "Request failed",
  onRetry,
  retrying = false,
  className,
}: ApiErrorAlertProps) {
  if (error === null || error === undefined) return null
  // Render only the shared, normalized message. Never enumerate the error,
  // raw transport data, details, innerException, or a JavaScript stack trace.
  const { message } = normalizeApiError(error)

  return (
    <div role="alert" className={cn("flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800", className)}>
      <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="break-words text-sm">{message}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="mt-2" disabled={retrying} onClick={onRetry}>
            <RotateCcw className={retrying ? "animate-spin" : undefined} aria-hidden="true" />
            {retrying ? "Retrying…" : "Try again"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
