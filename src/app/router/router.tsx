import { createBrowserRouter, type RouteObject } from "react-router-dom"

import { RequireAuth } from "@/app/router/RequireAuth"
import { RequireRole } from "@/app/router/RequireRole"
import { routePaths } from "@/app/router/routePaths"
import { botWorkspaceLoader } from "@/features/bots/loaders/botWorkspaceLoader"
import { PageErrorState } from "@/shared/components/feedback/PageErrorState"
import { RouteLoadingState } from "@/shared/components/feedback/RouteLoadingState"

const lazyPage = (loader: () => Promise<{ default: React.ComponentType }>) => async () => {
  const module = await loader()
  return { Component: module.default }
}

export const appRoutes: RouteObject[] = [
  {
    path: routePaths.root,
    errorElement: <PageErrorState />,
    hydrateFallbackElement: <RouteLoadingState />,
    children: [
      {
        index: true,
        lazy: lazyPage(() => import("@/pages/RootRedirectPage")),
      },
      {
        lazy: lazyPage(() => import("@/layouts/auth/AuthLayout")),
        children: [
          {
            path: routePaths.login,
            lazy: lazyPage(() => import("@/features/auth/pages/UserLoginPage")),
          },
          {
            path: routePaths.adminLogin,
            lazy: lazyPage(() => import("@/features/auth/pages/AdminLoginPage")),
          },
        ],
      },
      {
        element: <RequireAuth realm="user" />,
        children: [
          {
            element: <RequireRole roles={["User"]} />,
            children: [
              {
                path: routePaths.dashboard,
                lazy: lazyPage(() => import("@/layouts/client/ClientMainLayout")),
                children: [
                  {
                    index: true,
                    lazy: lazyPage(() => import("@/features/client/pages/ClientOverviewPage")),
                  },
                  {
                    path: "bots",
                    lazy: lazyPage(() => import("@/features/client/pages/ClientBotsPage")),
                  },
                  {
                    path: "settings",
                    lazy: lazyPage(() => import("@/features/client/pages/ClientSettingsPage")),
                  },
                ],
              },
              {
                path: routePaths.botWorkspacePattern,
                // The boundary reports blocked data until a real adapter exists.
                loader: botWorkspaceLoader,
                lazy: lazyPage(() => import("@/layouts/bot/BotWorkspaceLayout")),
                children: [
                  {
                    index: true,
                    lazy: lazyPage(() => import("@/features/bots/pages/BotWorkspaceHomePage")),
                  },
                  {
                    path: ":tabSlug",
                    lazy: lazyPage(() => import("@/features/bots/pages/BotTabRoutePage")),
                  },
                  {
                    // Unknown nested paths keep the workspace's navigation.
                    path: "*",
                    lazy: lazyPage(() => import("@/features/bots/pages/BotTabRoutePage")),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <RequireAuth realm="admin" />,
        children: [
          {
            element: <RequireRole roles={["Admin", "SuperAdmin"]} />,
            children: [
              {
                path: routePaths.admin,
                lazy: lazyPage(() => import("@/layouts/admin/AdminLayout")),
                children: [
                  {
                    index: true,
                    lazy: lazyPage(() => import("@/features/admin/pages/AdminOverviewPage")),
                  },
                  {
                    path: "users",
                    lazy: lazyPage(() => import("@/features/admin/pages/AdminUsersPage")),
                  },
                  {
                    path: "bots",
                    lazy: lazyPage(() => import("@/features/admin/pages/AdminBotsPage")),
                  },
                  {
                    path: "subscriptions",
                    lazy: lazyPage(() => import("@/features/admin/pages/AdminSubscriptionsPage")),
                  },
                  {
                    path: "transactions",
                    lazy: lazyPage(() => import("@/features/admin/pages/AdminTransactionsPage")),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: "*",
        lazy: lazyPage(() => import("@/pages/NotFoundPage")),
      },
    ],
  },
]

export const router = createBrowserRouter(appRoutes)

