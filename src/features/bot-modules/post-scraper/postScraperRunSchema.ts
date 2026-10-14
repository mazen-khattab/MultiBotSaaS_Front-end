/**
 * This is a readiness marker, not a permissive form or a production JSON schema.
 * Part 19 confirms JSON syntax validation on the backend, but no per-module
 * metadata fields or version policy. Do not infer them from V2's sample JSON.
 */
export const postScraperRunSchema = Object.freeze({
  status: "blocked",
  reason: "The FB-POSTS-SCRAPER infoJson field schema and version policy are not documented.",
} as const)
