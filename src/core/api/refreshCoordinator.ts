import { normalizeApiError, type NormalizedApiError } from "@/core/api/apiError"
import type { ApiResponse } from "@/core/api/apiTypes"
import { authEndpoints } from "@/services/auth/auth.endpoints"
import type { AuthLoginResponse, AuthRealm } from "@/services/auth/auth.types"

type RefreshResponse = ApiResponse<AuthLoginResponse>
type RefreshRequest = (endpoint: string) => Promise<RefreshResponse>
type Subscriber<T> = (event: T) => void

export interface RefreshSuccessEvent {
  realm: AuthRealm
  response: RefreshResponse
}

export interface RefreshFailureEvent {
  realm: AuthRealm
  error: NormalizedApiError
}

const subscribe = <T>(subscribers: Set<Subscriber<T>>, callback: Subscriber<T>) => {
  subscribers.add(callback)
  return () => { subscribers.delete(callback) }
}

const publish = <T>(subscribers: Set<Subscriber<T>>, event: T) => {
  for (const callback of [...subscribers]) {
    try {
      callback(event)
    } catch {
      // A subscriber must not break refresh cleanup or other auth subscribers.
    }
  }
}

const browserPathname = () => typeof window === "undefined" ? "/" : window.location.pathname

export const createRefreshCoordinator = (getPathname: () => string = browserPathname) => {
  let sessionRealm: AuthRealm | null = null
  let sessionVersion = 0
  let expiredError: NormalizedApiError | null = null
  let inFlight: Promise<RefreshResponse> | null = null
  const successSubscribers = new Set<Subscriber<RefreshSuccessEvent>>()
  const failureSubscribers = new Set<Subscriber<RefreshFailureEvent>>()
  const expirySubscribers = new Set<Subscriber<NormalizedApiError>>()

  const resolveRealm = (): AuthRealm => {
    if (sessionRealm) return sessionRealm
    const pathname = getPathname()
    return pathname === "/admin" || pathname.startsWith("/admin/") ? "admin" : "user"
  }

  const notifyAuthExpired = (error: unknown) => {
    if (expiredError) return
    expiredError = normalizeApiError(error)
    sessionVersion += 1
    publish(expirySubscribers, expiredError)
  }

  const refresh = (execute: RefreshRequest): Promise<RefreshResponse> => {
    if (expiredError) return Promise.reject(expiredError)
    if (inFlight) return inFlight

    const realm = resolveRealm()
    const startedVersion = sessionVersion
    const pending = Promise.resolve()
      .then(() => execute(authEndpoints[realm].refresh))
      .then((response) => {
        if (expiredError) throw expiredError
        if (sessionVersion !== startedVersion) {
          throw normalizeApiError("The session changed during refresh.")
        }
        sessionVersion += 1
        publish(successSubscribers, { realm, response })
        return response
      })
      .catch((rawError: unknown) => {
        const error = expiredError ?? normalizeApiError(rawError)
        if (sessionVersion === startedVersion) notifyAuthExpired(error)
        publish(failureSubscribers, { realm, error })
        throw error
      })
      .finally(() => {
        if (inFlight === pending) inFlight = null
      })
    inFlight = pending
    return pending
  }

  return {
    resolveRealm,
    // Part 8 registers the realm after login; null restores pathname fallback.
    setSessionRealm: (realm: AuthRealm | null) => {
      sessionRealm = realm
      expiredError = null
      sessionVersion += 1
    },
    getSessionVersion: () => sessionVersion,
    getExpiredError: () => expiredError,
    refresh,
    notifyAuthExpired,
    onRefreshSuccess: (callback: Subscriber<RefreshSuccessEvent>) => subscribe(successSubscribers, callback),
    onRefreshFailed: (callback: Subscriber<RefreshFailureEvent>) => subscribe(failureSubscribers, callback),
    onAuthExpired: (callback: Subscriber<NormalizedApiError>) => subscribe(expirySubscribers, callback),
  }
}

export const refreshCoordinator = createRefreshCoordinator()
