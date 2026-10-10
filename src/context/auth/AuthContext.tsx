import { createContext } from "react"

import type { AuthRealm, AuthUser, LoginRequest } from "@/services/auth/auth.types"

export interface AuthState {
  user: AuthUser | null
  realm: AuthRealm | null
  status: "bootstrapping" | "authenticated" | "anonymous"
}

export interface AuthContextValue extends AuthState {
  loginUser: (credentials: LoginRequest) => Promise<AuthUser>
  loginAdmin: (credentials: LoginRequest) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<AuthUser>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
