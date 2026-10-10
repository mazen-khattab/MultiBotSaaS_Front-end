import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getBootstrapRealm } from "@/app/router/authNavigation";
import { AuthContext, type AuthState } from "@/context/auth/AuthContext";
import { normalizeApiError } from "@/core/api/apiError";
import { refreshCoordinator } from "@/core/api/refreshCoordinator";
import { AuthService } from "@/services/auth/AuthService";
import { readAuthIdentity } from "@/services/auth/auth.identity";
import type {
  AuthRealm,
  AuthUser,
  LoginRequest,
} from "@/services/auth/auth.types";

const anonymousState: AuthState = {
  user: null,
  realm: null,
  status: "anonymous",
};
const initialRealm = () =>
  getBootstrapRealm(
    typeof window === "undefined" ? "/" : window.location.pathname,
  );

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    ...anonymousState,
    status: initialRealm() ? "bootstrapping" : "anonymous",
  }));
  const bootstrapRealm = useRef(initialRealm());
  const bootstrapPromise = useRef<Promise<AuthUser> | null>(null);
  const bootstrapVersion = useRef(0);
  const actionVersion = useRef(0);
  const action = useRef<"bootstrap" | "login" | "logout" | null>(null);

  const hydrate = useCallback((user: AuthUser, realm: AuthRealm) => {
    refreshCoordinator.setSessionRealm(realm);
    setState({ user, realm, status: "authenticated" });
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribeExpiry = refreshCoordinator.onAuthExpired(() => {
      actionVersion.current += 1;
      action.current = null;
      setState(anonymousState);
    });
    const unsubscribeRefresh = refreshCoordinator.onRefreshSuccess(
      ({ realm, response }) => {
        if (action.current !== null) return;
        try {
          hydrate(readAuthIdentity(response, realm), realm);
        } catch (error: unknown) {
          refreshCoordinator.notifyAuthExpired(error);
        }
      },
    );

    const realm = bootstrapRealm.current;
    if (realm) {
      // Retain the Promise through StrictMode's effect replay to rotate once.
      if (!bootstrapPromise.current) {
        action.current = "bootstrap";
        bootstrapVersion.current = actionVersion.current;
        bootstrapPromise.current =
          realm === "admin"
            ? AuthService.refreshAdmin()
            : AuthService.refreshUser();
      }
      void bootstrapPromise.current
        .then((user) => {
          if (active && actionVersion.current === bootstrapVersion.current)
            hydrate(user, realm);
        })
        .catch((error: unknown) => {
          if (active && actionVersion.current === bootstrapVersion.current)
            refreshCoordinator.notifyAuthExpired(error);
        })
        .finally(() => {
          if (active && actionVersion.current === bootstrapVersion.current)
            action.current = null;
        });
    }

    return () => {
      active = false;
      unsubscribeExpiry();
      unsubscribeRefresh();
    };
  }, [hydrate]);

  const login = useCallback(
    async (realm: AuthRealm, credentials: LoginRequest) => {
      // An older refresh response must finish setting cookies before a new login.
      await refreshCoordinator.getPendingRefresh()?.catch(() => undefined);
      const version = ++actionVersion.current;
      action.current = "login";
      try {
        const user = await (realm === "admin"
          ? AuthService.loginAdmin(credentials)
          : AuthService.loginUser(credentials));
        if (version !== actionVersion.current)
          throw normalizeApiError("The authentication attempt was superseded.");
        hydrate(user, realm);
        return user;
      } catch (error: unknown) {
        if (version === actionVersion.current) {
          setState((current) =>
            current.status === "bootstrapping" ? anonymousState : current,
          );
        }
        throw normalizeApiError(error);
      } finally {
        if (version === actionVersion.current) action.current = null;
      }
    },
    [hydrate],
  );

  const logout = useCallback(async () => {
    const version = ++actionVersion.current;
    action.current = "logout";
    const realm = refreshCoordinator.resolveRealm();
    try {
      // Let an existing rotation finish before the backend clears cookies.
      await refreshCoordinator.getPendingRefresh()?.catch(() => undefined);
      await (realm === "admin"
        ? AuthService.logoutAdmin()
        : AuthService.logoutUser());
      if (version === actionVersion.current)
        refreshCoordinator.notifyAuthExpired("You have signed out.");
    } catch (error: unknown) {
      throw normalizeApiError(error);
    } finally {
      if (version === actionVersion.current) action.current = null;
    }
  }, []);

  const refresh = useCallback(
    () =>
      refreshCoordinator.resolveRealm() === "admin"
        ? AuthService.refreshAdmin()
        : AuthService.refreshUser(),
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      loginUser: (credentials: LoginRequest) => login("user", credentials),
      loginAdmin: (credentials: LoginRequest) => login("admin", credentials),
      logout,
      refresh,
    }),
    [state, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
