import { Link, Outlet } from "react-router-dom"

import { getAuthHome } from "@/app/router/authNavigation"
import { useAuth } from "@/context/auth/useAuth"
import type { AuthRole } from "@/services/auth/auth.types"
import { RouteLoadingState } from "@/shared/components/feedback/RouteLoadingState"
import { Button } from "@/shared/ui/button"

export function RequireRole({ roles }: { roles: readonly AuthRole[] }) {
  const { user, realm, status } = useAuth()
  if (status === "bootstrapping") return <RouteLoadingState />
  if (status === "authenticated" && user && roles.includes(user.role)) return <Outlet />
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-4 rounded-2xl border bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">Your account does not have access to this workspace.</p>
        <Button asChild><Link to={realm ? getAuthHome(realm) : "/login"}>Return to your workspace</Link></Button>
      </div>
    </main>
  )
}
