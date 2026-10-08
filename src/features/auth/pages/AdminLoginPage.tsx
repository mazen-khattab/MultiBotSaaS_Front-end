import { ArrowRight, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { Button } from "@/shared/ui/button"

export default function AdminLoginPage() {
  return (
    <div>
      <div className="mb-8">
        <span className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Admin access</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in to the platform administration workspace.
        </p>
      </div>

      <form className="space-y-5" aria-label="Administrator sign in" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-2">
          <label htmlFor="admin-email" className="text-sm font-medium text-slate-800">
            Admin email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@company.com"
            className="h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/15"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="admin-password" className="text-sm font-medium text-slate-800">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/15"
          />
        </div>
        <Button type="submit" className="w-full" disabled title="Authentication is added in Part 2">
          Continue to admin
          <ArrowRight aria-hidden="true" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Admin authentication will be enabled in Part 2.
        </p>
      </form>

      <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
        Looking for your workspace?{" "}
        <Link className="font-semibold text-blue-600 hover:text-blue-700" to={routePaths.login}>
          User sign in
        </Link>
      </div>
    </div>
  )
}

