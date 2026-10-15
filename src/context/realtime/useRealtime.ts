import { useContext } from "react"

import { RealtimeContext } from "@/context/realtime/RealtimeContext"

/** Features subscribe in an effect and return its unsubscribe function on cleanup. */
export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) throw new Error("useRealtime must be used within RealtimeProvider.")
  return context
}
