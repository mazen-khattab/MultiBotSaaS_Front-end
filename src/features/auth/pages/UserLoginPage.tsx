import { ArrowRight, LockKeyhole } from "lucide-react"
import { Link } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { Button } from "@/shared/ui/button"

export default function UserLoginPage() {
  return (
    <div>
      <div className="mb-8">
        <span className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in to manage your bots and automation workspace.
        </p>
      </div>

      <form className="space-y-5" aria-label="User sign in" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-800">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-800">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
          />
        </div>
        <Button type="submit" className="w-full" disabled title="Authentication is added in Part 2">
          Sign in
          <ArrowRight aria-hidden="true" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Sign-in integration will be enabled in Part 2.
        </p>
      </form>

      <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
        Platform administrator?{" "}
        <Link className="font-semibold text-blue-600 hover:text-blue-700" to={routePaths.adminLogin}>
          Admin sign in
        </Link>
      </div>
    </div>
  )
}

