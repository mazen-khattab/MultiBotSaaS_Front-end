import { z } from "zod"

import type { SignalREventPayloadMap } from "@/services/realtime/signalr.types"

/** No aliases, progress events, or account-status events are emitted by the API. */
export const signalREvents = ["ScrapeCompleted", "LeadStatusUpdated", "JobFailed"] as const
export type SignalREventName = typeof signalREvents[number]

// Reject unsafe numeric IDs rather than invalidating a cache entry for a
// silently rounded identifier, including Int64 lead IDs serialized as numbers.
const safeId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const payloadSchemas: { readonly [TEvent in SignalREventName]: z.ZodType<SignalREventPayloadMap[TEvent]> } = {
  ScrapeCompleted: z.object({ scrapeId: safeId, leadsCount: z.number().int().nonnegative() }),
  LeadStatusUpdated: z.object({ leadId: safeId, status: z.enum(["Pending", "Completed", "Failed"]) }),
  JobFailed: z.object({ jobId: safeId, message: z.string() }),
}

/** Each event carries one object; allowlist its fields before feature delivery. */
export function readSignalREvent<TEvent extends SignalREventName>(
  event: TEvent, args: readonly unknown[],
): SignalREventPayloadMap[TEvent] | undefined {
  if (!Object.hasOwn(payloadSchemas, event) || args.length !== 1) return undefined
  const parsed = payloadSchemas[event].safeParse(args[0])
  return parsed.success ? parsed.data : undefined
}
