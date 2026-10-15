# Admin bots

Contract: `docs/FRONTEND_BACKEND_CONTRACT_V2.md` §13. GET/POST `/api/v1/admin/bots`,
GET/PUT `/{id}` and PUT `/{id}/activate` or `/{id}/deactivate` are available.
The feature owns its service, query hooks, paginated table, detail/confirmation
dialogs and metadata forms. Filters: pageNumber, pageSize, search, isActive.
Writes use shared admin cookie authentication; the backend checks active admin
identity and the JWT's current Admin/SuperAdmin role.

Creation normalizes a dynamic module code and creates an inactive bot. Deploy its
frontend registry/module support before explicit activation. Metadata updates omit
the immutable code and lifecycle fields. Zero price and zero cooldown are valid.
The backend remains responsible for decimal(18,2) precision; JavaScript numbers
cannot represent every value at its upper limit exactly.

Missing APIs: bot deletion and module-code migration/change. Generic bot creation
does not supply RAG functionality. There is no frontend restriction to seeded codes
and no invented module-readiness endpoint or permission.
