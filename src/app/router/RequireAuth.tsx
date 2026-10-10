import { Navigate, Outlet, useLocation } from "react-router-dom"

import { getAuthLogin } from "@/app/router/authNavigation"
import { useAuth } from "@/context/auth/useAuth"
import type { AuthRealm } from "@/services/auth/auth.types"
import { RouteLoadingState } from "@/shared/components/feedback/RouteLoadingState"

export function RequireAuth({ realm }: { realm: AuthRealm }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === "bootstrapping") return <RouteLoadingState />
  if (status === "anonymous") {
    return <Navigate to={getAuthLogin(realm)} replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  }
  return <Outlet />
}