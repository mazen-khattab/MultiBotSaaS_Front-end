/** Describes integration readiness, never the current user's authorization. */
export type CapabilityStatus =
  | "available"
  | "blocked-backend"
  | "frontend-not-implemented"
  | "worker-only"

interface CapabilityDescription {
  /** Section in docs/FRONTEND_BACKEND_CONTRACT_V2.md, the authoritative source. */
  readonly contract: string
  readonly description: string
}

/** External operations cannot be classified as available browser integrations.
 * The webhook shares the external-only state but retains its distinct audience. */
export type FrontendCapability = CapabilityDescription & (
  | { readonly status: "available" | "frontend-not-implemented"; readonly audience: "browser" }
  | { readonly status: "blocked-backend"; readonly audience: "browser" }
  | { readonly status: "worker-only"; readonly audience: "worker" | "webhook" }
)
