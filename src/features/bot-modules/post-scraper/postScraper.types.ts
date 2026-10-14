import type { RunDto } from "@/features/runs/types/runs.types"

/**
 * Implement this inside the module once its metadata contract is approved.
 * TMetadata describes that future payload, not account/group selections or the
 * outer CreateRunDto. An unrecognized stored payload must remain unextracted.
 */
export interface PostScraperRunAdapter<TMetadata> {
  readonly serializeInfoJson: (metadata: TMetadata) => RunDto["infoJson"]
  readonly extractInfoJson: (infoJson: RunDto["infoJson"]) => TMetadata | undefined
}

/** Frontend readiness only; this state is never sent in a scrape request. */
export type PostScraperRunAdapterState<TMetadata> =
  | { readonly status: "blocked"; readonly reason: string }
  | { readonly status: "ready"; readonly adapter: PostScraperRunAdapter<TMetadata> }
