import { AlertTriangle, RotateCcw } from "lucide-react"
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { Button } from "@/shared/ui/button"

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? "The requested page could not be found."
      : "The page could not be loaded."
  }

  if (error instanceof Error && import.meta.env.DEV) {
    return error.message
  }

  return "An unexpected error interrupted this page."
}

export function PageErrorState() {
  const error = useRouteError()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{getErrorMessage(error)}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => window.location.reload()}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link to={routePaths.root}>Return home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

