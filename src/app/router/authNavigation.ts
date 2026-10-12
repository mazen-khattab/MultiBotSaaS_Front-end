import { routePaths } from "@/app/router/routePaths"
import type { AuthRealm } from "@/services/auth/auth.types"

const isUnderPath = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`)

export const getBootstrapRealm = (pathname: string): AuthRealm | null => {
  if (isUnderPath(pathname, routePaths.admin)) return "admin"
  if (isUnderPath(pathname, routePaths.dashboard)) return "user"
  return null
}

export const getAuthHome = (realm: AuthRealm) => realm === "admin" ? routePaths.admin : routePaths.dashboard
export const getAuthLogin = (realm: AuthRealm) => realm === "admin" ? routePaths.adminLogin : routePaths.login

export const getLoginDestination = (realm: AuthRealm, navigationState: unknown) => {
  const home = getAuthHome(realm)
  if (typeof navigationState !== "object" || navigationState === null ||
    !("from" in navigationState) || typeof navigationState.from !== "string") return home
  const destination = navigationState.from
  // Accept only same-realm application paths, never an external URL or login.
  if (!destination.startsWith(`${home}/`) && destination !== home &&
    !destination.startsWith(`${home}?`) && !destination.startsWith(`${home}#`)) return home
  try {
    const pathname = decodeURIComponent(new URL(destination, "http://frontend.invalid").pathname).replace(/\/+$/, "")
    return isUnderPath(pathname, home) && pathname !== routePaths.adminLogin ? destination : home
  } catch {
    return home
  }
}
