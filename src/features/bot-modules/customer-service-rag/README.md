# Customer Service RAG boundary (Part 20)

This folder implements the architecture and static page shells prescribed by
Part 20. The current backend contract, section 6.4 of
`docs/FRONTEND_BACKEND_CONTRACT_V2.md`, explicitly confirms that these capabilities
are missing:

- Knowledge-base entities and controllers.
- Document upload and indexing status.
- Conversations and messages.
- Prompt settings.
- Playground chat.

Each page explains its unavailable backend state using the existing
`ComingSoonState`. There are no forms, file controls, chat inputs, sample business
records, local persistence, services, DTOs, API routes, upload handlers, indexing
polling, or message simulation. Importing the module and navigating its pages
requires no RAG network calls.

## Module composition and registration

`rag.module.ts` exports `ragModuleShell`, typed against the existing module
interface with `uiModuleCode` omitted. It declares lazy Knowledge Base,
Conversations, Prompt Settings, and Playground pages, in that order. Resolving an
unknown tab returns undefined; it never falls back to another page.

The shell has no runtime code and is absent from `botModulesRegistry`. The
illustrative label `CUSTOMER_SERVICE_RAG` is not a confirmed backend code and
its underscores fail the current admin bot creation format. No alternative
production code is invented. The production registry, resolver, routing, and
unknown-module behavior are unchanged.

Workspace tests add a test-only code through the existing injected registry and
descriptor loader. This makes the layout, sidebar, lazy loading, and navigation
reviewable without registering an unsupported production feature or calling the
Bot API. The shell itself does not grant access or claim backend entitlements.

Future integration requires both an actual backend-supplied runtime code and a
documented RAG API contract, including request/response shapes and authorization.
Once those exist, implement the feature integration and register the confirmed
definition through the existing registry. The workspace router and registry
engine already support these pages and need no new RAG-specific branches.
Generic catalog/admin bot APIs alone do not establish RAG readiness.

## Definition of Done

- [x] RAG folders, module composition, and four page boundaries are present.
- [x] Every page explicitly describes the unavailable backend support.
- [x] Module/page code performs no network calls; routing is checked using only
  test-owned registration data.

## Verification

Registry tests check that the shell has no runtime code, is not registered, and
resolves only its declared lazy pages. The workspace regression navigates every
page through the real existing layout/router with an injected test definition,
checks the unavailable text and absence of interactive controls, and rejects
Axios, Fetch, or XMLHttpRequest attempts.

Validation results:

- `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- All 4 focused RAG, production-registry, and unsupported-module checks passed.
  The first focused run hit sandbox `spawn EPERM`; the approved rerun outside
  the sandbox passed.
- The full suite (`npm test -- --test-concurrency=1`) ran 209 tests: 203 passed
  and 6 failed. The RAG checks passed. The failures are the five inherited Leads
  route assertions and the Leads/messaging workspace regression, which still
  expect `/api/leads` while the service uses `/api/v1/Leads`.
- The live contract was updated during this task and now documents versioned
  `/api/v1/leads` routes in sections 7.3 and 16. Those edits are preserved; Part
  20 does not change the separate Leads integration or its older route fixtures.
- Test servers emitted non-fatal HMR port warnings. The build retains the
  existing approximately 503 kB main-chunk warning.

The prescribed RAG architecture is implemented, but full-suite verification
remains unresolved because of those inherited Leads tests. No live RAG backend
is available to exercise. External plan documents are unchanged; no PR is created.

Part 27 follow-up: the historical Leads route fixtures above are now aligned
with the versioned contract. See the [testing report](../../../../docs/PART_27_TESTING.md)
for current checks. RAG remains explicitly blocked by its missing backend APIs.
