import { normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import type { AuthRealm, AuthUser } from "@/services/auth/auth.types"

export const readAuthIdentity = (response: unknown, realm: AuthRealm): AuthUser => {
  if (!isApiResponse(response)) throw normalizeApiError(response)
  const user = response.data
  if (typeof user !== "object" || user === null ||
    !("userId" in user) || typeof user.userId !== "string" ||
    !("email" in user) || typeof user.email !== "string" ||
    !("name" in user) || typeof user.name !== "string" ||
    !("role" in user)) {
    throw normalizeApiError("The server returned an unsupported authentication response.")
  }
  const role = user.role
  if ((role !== "User" && role !== "Admin" && role !== "SuperAdmin") ||
    (realm === "user" ? role !== "User" : role === "User")) {
    throw normalizeApiError("The server returned an unsupported authentication response.")
  }
  // Copy only the documented identity fields into frontend state.
  return { userId: user.userId, email: user.email, name: user.name, role }
}
