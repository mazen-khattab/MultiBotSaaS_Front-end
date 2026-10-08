import { Navigate } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"

export default function RootRedirectPage() {
  return <Navigate to={routePaths.login} replace />
}

