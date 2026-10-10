import { api, refreshSession } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import { authEndpoints } from "@/services/auth/auth.endpoints"
import { readAuthIdentity } from "@/services/auth/auth.identity"
import type { AuthRealm, LoginRequest } from "@/services/auth/auth.types"

const login = async (realm: AuthRealm, credentials: LoginRequest) => {
  const response = await api.post<unknown>(authEndpoints[realm].login, credentials)
  return readAuthIdentity(response.data, realm)
}

const logout = async (realm: AuthRealm): Promise<void> => {
  const response = await api.post<unknown>(authEndpoints[realm].logout)
  if (!isApiResponse(response.data) || response.data.data !== true) {
    throw normalizeApiError(response.data)
  }
}

const refresh = async (realm: AuthRealm) => readAuthIdentity(await refreshSession(realm), realm)

export const AuthService = {
  loginUser: (credentials: LoginRequest) => login("user", credentials),
  logoutUser: () => logout("user"),
  refreshUser: () => refresh("user"),
  loginAdmin: (credentials: LoginRequest) => login("admin", credentials),
  logoutAdmin: () => logout("admin"),
  refreshAdmin: () => refresh("admin"),
}
