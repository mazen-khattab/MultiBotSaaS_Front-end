import { createContext } from "react"

import type { RealtimeContextValue } from "@/services/realtime/signalr.types"

/** Features receive lifecycle state and local subscriptions, never the raw hub. */
export const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined)
