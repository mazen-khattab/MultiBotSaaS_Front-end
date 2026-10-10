import { ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { LoginForm } from "@/features/auth/components/LoginForm"

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

      <LoginForm realm="admin" />

      <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
        Looking for your workspace?{" "}
        <Link className="font-semibold text-blue-600 hover:text-blue-700" to={routePaths.login}>
          User sign in
        </Link>
      </div>
    </div>
  )
}

