export type AuthRole = "User" | "Admin" | "SuperAdmin"

export interface AuthUser {
  userId: string
  email: string
  name: string
  role: AuthRole
}

export interface LoginRequest {
  email: string
  password: string
}

export type AuthLoginResponse = AuthUser

export type AuthRealm = "user" | "admin"

