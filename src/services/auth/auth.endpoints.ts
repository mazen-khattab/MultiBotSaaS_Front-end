import type { AuthRealm } from "@/services/auth/auth.types"

interface AuthEndpointSet {
  login: string
  logout: string
  refresh: string
  me: string
}

export const authEndpoints = {
  user: {
    login: "/api/v1/auth/login",
    logout: "/api/v1/auth/logout",
    refresh: "/api/v1/auth/refresh",
    me: "/api/v1/auth/me",
  },
  admin: {
    login: "/api/v1/admin/auth/login",
    logout: "/api/v1/admin/auth/logout",
    refresh: "/api/v1/admin/auth/refresh",
    me: "/api/v1/admin/auth/me",
  },
} as const satisfies Record<AuthRealm, AuthEndpointSet>

