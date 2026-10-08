import { ArrowLeft, Compass } from "lucide-react"
import { Link } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { Button } from "@/shared/ui/button"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-lg text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-white text-blue-600 shadow-sm">
          <Compass className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          This page is off the map
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          The address may be incorrect, or the page may have moved to a new workspace.
        </p>
        <Button asChild className="mt-7">
          <Link to={routePaths.login}>
            <ArrowLeft aria-hidden="true" />
            Back to sign in
          </Link>
        </Button>
      </div>
    </main>
  )
}

