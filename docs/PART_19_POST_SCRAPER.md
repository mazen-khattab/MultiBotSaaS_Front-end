# Part 19: Post Scraper specialization

> Update: Post Scraper creation now implements the user-requested Search term and
> Maximum results form. See [Start run and custom bot fields](./START_RUN.md) for
> the current configuration, payload, and workflow compatibility requirement.
> The blocked schema/adapter descriptions below record the original Part 19 state.

The exact backend code `FB-POSTS-SCRAPER` now resolves to its module under
`src/features/bot-modules/post-scraper`. It uses Part 18's shared composition and
the existing `GenericRunsPage`, Runs hooks, and services. Other registered codes
keep their prior configuration. All five existing workspace tabs and their order
are preserved; no illustrative code or new endpoint is registered.

## Implemented boundary

- `postScraper.module.ts` owns the run configuration. It preserves the standard
  history columns and adds Account ID and Target group ID from documented
  `ScrapeDto` fields, with an em dash for null values. Names, metadata columns,
  and extra account/group requests are not inferred.
- `postScraper.types.ts` defines `PostScraperRunAdapter<TMetadata>`: serialization
  returns `infoJson` text, while extraction returns the agreed metadata type or
  undefined for an unrecognized payload. The generic describes an eventual
  approved payload, not a new backend DTO or a production field schema.
- `postScraperRunSchema.ts` explicitly reports the undocumented schema as blocked.
  It is a readiness marker, not a permissive Zod schema or empty form.
- `postScraperRunAdapter.ts` exposes that blocked state without a serializer or
  extractor. No empty-object fallback, keywords, dates, or `schemaVersion` field
  is added to a live request. The shared CreateRun adapter is unchanged.

Run history stays available through `GET /api/v1/scrapes`, with the positive
workspace botId, server pagination, and optional status filtering. Existing
details and cancellation actions remain enabled; Retry remains unsupported.
The module does not modify the generic renderer or put Post Scraper conditions
inside it. Stored `infoJson` remains opaque and is not rendered as metadata.

## Explicitly deferred metadata

Part 19 states that the backend checks nonempty, syntactically valid JSON, stores
the supplied text, and parses it for n8n's `info`. That does not establish an
`FB-POSTS-SCRAPER` field schema. V2's section 8.1 examples are insufficient to
approve field names, defaults, validation rules, or metadata versioning.

Production run creation and metadata extraction are intentionally unavailable,
as prescribed by Part 19. The UI explains that the run settings are not ready;
it does not fetch eligible accounts or submit a placeholder scrape. Before
enabling creation, document the module's metadata fields and version policy,
implement its form/schema and typed adapter, and bind them through the existing
`StartRunConfig`. Agree any wire-format versioning with backend/product before
changing payloads. No missing endpoint blocks DTO-based history rendering.

## Definition of Done

- [x] The module specialization boundary exists and is selected by the exact code.
- [x] A typed serialization/extraction adapter contract exists in the module.
- [x] The missing metadata schema is explicit and its dependent features stay blocked.

## Verification

Registry tests verify exact-code selection, unchanged sibling modules, and the
unavailable schema/adapter. The existing strict type fixture exercises typed
adapter inputs/outputs and rejects using the blocked production adapter. The
workspace regression exercises the real Post Scraper route and shared renderer,
including nullable DTO columns, opaque historical metadata, bot-scoped pagination
and filtering, and disabled creation without eligibility requests.

Validation results:

- `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- All 8 focused registry, strict type-fixture, composition, and route checks passed.
  The initial focused test attempt hit sandbox `spawn EPERM`; the approved
  rerun completed successfully outside the sandbox.
- The full suite (`npm test -- --test-concurrency=1`) ran 207 tests: 201 passed
  and 6 failed. All failures are the pre-existing Leads prefix conflict: five
  Leads tests and the complete Leads/messaging workspace navigation regression.
  The Post Scraper checks and all Runs tests passed in this full run as well.
- Test servers emitted non-fatal HMR port warnings. The main build chunk remains
  approximately 503 kB. Live authenticated backend calls have not been exercised.

Part 18's pre-existing Leads route conflict remains outside this specialization:
the service uses `/api/v1/Leads`, while V2 and tests specify `/api/leads`. Its
existing implementation is preserved pending the outstanding route clarification.
Full-suite verification remains unresolved; these results are not a clean
full-suite pass. External plan documents are unchanged; no PR is created.
