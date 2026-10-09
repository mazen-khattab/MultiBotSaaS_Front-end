import axios, { type InternalAxiosRequestConfig } from "axios"

import { isSessionExpiredPayload, normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import type { ApiResponse } from "@/core/api/apiTypes"
import { HTTP_STATUS } from "@/core/api/httpStatus"
import { refreshCoordinator } from "@/core/api/refreshCoordinator"
import { env } from "@/core/config/env"
import { authEndpoints } from "@/services/auth/auth.endpoints"
import type { AuthLoginResponse } from "@/services/auth/auth.types"

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean
  _authSessionVersion?: number
}

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Language": env.local,
  },
})

const isRefreshRequest = (config: AuthRequestConfig) => {
  const pathname = new URL(api.getUri(config), "http://frontend.invalid").pathname.replace(/\/$/, "")
  return pathname === authEndpoints.user.refresh || pathname === authEndpoints.admin.refresh
}

export const refreshSession = () => refreshCoordinator.refresh(async (endpoint) => {
  const response = await api.post<ApiResponse<AuthLoginResponse>>(endpoint)
  if (!isApiResponse<AuthLoginResponse>(response.data)) throw normalizeApiError(response.data)
  return response.data
})

api.interceptors.request.use((config: AuthRequestConfig) => {
  config.withCredentials = true
  config.headers.delete("Authorization")
  config.auth = undefined
  config._authSessionVersion ??= refreshCoordinator.getSessionVersion()
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (rawError: unknown) => {
    const error = normalizeApiError(rawError)
    if (!axios.isAxiosError<unknown>(rawError) || rawError.response?.status !== HTTP_STATUS.UNAUTHORIZED) {
      throw error
    }

    const config: AuthRequestConfig | undefined = rawError.config
    if (isSessionExpiredPayload(rawError.response.data)) {
      refreshCoordinator.notifyAuthExpired(error)
      throw error
    }
    if (!config || isRefreshRequest(config)) throw error
    if (config._authRetry) {
      refreshCoordinator.notifyAuthExpired(error)
      throw error
    }
    const expiredError = refreshCoordinator.getExpiredError()
    if (expiredError) throw expiredError

    config._authRetry = true
    try {
      // A late 401 for a request sent before rotation uses the refreshed cookies
      // without rotating again. Requests failing together share one Promise.
      if (config._authSessionVersion === refreshCoordinator.getSessionVersion()) await refreshSession()
      const expiredAfterRefresh = refreshCoordinator.getExpiredError()
      if (expiredAfterRefresh) throw expiredAfterRefresh
      config._authSessionVersion = refreshCoordinator.getSessionVersion()
      return await api.request(config)
    } catch (retryError: unknown) {
      throw normalizeApiError(retryError)
    }
  },
)

export default api
