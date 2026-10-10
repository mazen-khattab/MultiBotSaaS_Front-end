import { QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { useAuth } from "@/context/auth/useAuth"
import { createQueryClient } from "@/core/query/queryClient"

function SessionQueryProvider({ children }: { children: ReactNode }) {
  // A state initializer keeps the client stable through ordinary renders.
  const [client] = useState(createQueryClient)
  const lifetime = useRef(0)

  useEffect(() => {
    const currentLifetime = ++lifetime.current
    const dispose = () => {
      if (lifetime.current === currentLifetime) client.clear()
    }
    return () => {
      // StrictMode immediately replays this effect on the same mounted provider.
      // Defer disposal one microtask so replay does not cancel valid requests;
      // an actual unmount clears old entries and cancels their active queries.
      queueMicrotask(dispose)
    }
  }, [client])

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const { status, realm, user } = useAuth()
  // Swap the provider before rendering another principal's children, rather
  // than clearing a shared cache after a render could show the previous data.
  // Name/email updates and token rotation retain the same principal's cache.
  const sessionKey = status === "authenticated" && user && realm
    ? JSON.stringify([realm, user.userId, user.role])
    : "anonymous"

  return <SessionQueryProvider key={sessionKey}>{children}</SessionQueryProvider>
}
