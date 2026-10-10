import { Navigate } from "react-router-dom"

import { getAuthHome } from "@/app/router/authNavigation"
import { routePaths } from "@/app/router/routePaths"
import { useAuth } from "@/context/auth/useAuth"
import { RouteLoadingState } from "@/shared/components/feedback/RouteLoadingState"

export default function RootRedirectPage() {
  const { status, realm } = useAuth()
  if (status === "bootstrapping") return <RouteLoadingState />
  return <Navigate to={status === "authenticated" && realm ? getAuthHome(realm) : routePaths.login} replace />
}
