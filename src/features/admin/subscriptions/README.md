# Admin subscriptions (UserBot assignments)

Contract: `docs/FRONTEND_BACKEND_CONTRACT_V2.md` §14. GET/POST
`/api/v1/admin/subscriptions` and GET/DELETE `/{id}` are available. The route ID is
the **UserBot assignment ID**, not the bot or user ID. List filters: userId, botId,
isActive, pageNumber, pageSize. The UI filters by user/bot and paginates on the server.
All requests use shared admin cookies and refresh; backend active-admin/current-role
authorization is still required.

The feature owns its service, hooks, assignment form, table and detail/removal
dialogs. Assignment accepts only userId and botId, including inactive related
resources. Duplicate pairs return 409. Legacy purchasePrice/purchaseDate are
server managed; new assignments record zero price and current UTC time without
creating a payment or transaction. IDs can be copied from Users/Bots details.

Removal deletes the relationship and revokes its access while retaining related
user/bot resources. There is no inactive history, update/pause/renew operation or
recoverable removed assignment. Reassignment creates a new relationship ID.
Missing APIs: commercial plans, billing, checkout, payments, recurring subscriptions
and assignment history. `isActive=false` yields an empty page, not removed rows.
