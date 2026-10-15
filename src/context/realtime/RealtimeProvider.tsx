import { HubConnectionState } from "@microsoft/signalr"
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react"

import { useAuth } from "@/context/auth/useAuth"
import { RealtimeContext } from "@/context/realtime/RealtimeContext"
import { signalRService, type SignalRService } from "@/services/realtime/SignalRService"
import type { RealtimeSession, RealtimeSubscribe } from "@/services/realtime/signalr.types"

/** Match the auth principal's lifetime; cookie rotations retain the connection. */
export function RealtimeProvider({ children, service = signalRService }: { children: ReactNode; service?: SignalRService }) {
  const { status, user, realm } = useAuth()
  const userId = user?.userId
  const role = user?.role
  const session = useMemo<RealtimeSession | null>(() =>
    status === "authenticated" && userId && role && realm ? { userId, role, realm } : null,
  [status, userId, role, realm])
  const readSnapshot = useCallback(() => service.getSnapshot(session), [service, session])
  const snapshot = useSyncExternalStore(service.observe, readSnapshot, readSnapshot)
  const lifetime = useRef(0)
  const owner = useRef(service)

  useEffect(() => {
    const currentLifetime = ++lifetime.current
    owner.current = service
    if (session) void service.start(session)
    else void service.stop()
    const dispose = () => {
      if (lifetime.current === currentLifetime || owner.current !== service) void service.stop()
    }
    return () => {
      // StrictMode replays effects immediately. A real unmount still stops the
      // transport; principal switches are also stopped by start's session guard.
      queueMicrotask(dispose)
    }
  }, [session, service])

  const subscribe = useCallback<RealtimeSubscribe>((event, handler) =>
    session ? service.subscribe(session, event, handler) : () => undefined,
  [service, session])
  const retry = useCallback(() => session ? service.start(session) : Promise.resolve(), [service, session])
  const value = useMemo(() => ({
    status: session ? snapshot.status : HubConnectionState.Disconnected,
    error: session ? snapshot.error : null,
    recoveryVersion: snapshot.recoveryVersion,
    subscribe, retry,
  }), [session, snapshot, subscribe, retry])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
