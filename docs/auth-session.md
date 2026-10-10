# Authentication and session bootstrap (Part 8)

`AuthProvider` exposes `user`, `realm`, and `status` (`bootstrapping`,
`authenticated`, or `anonymous`), plus `loginUser`, `loginAdmin`, `logout`, and
`refresh`. Identity is held in memory. Tokens and credentials are never persisted
in localStorage or sessionStorage, and HTTP-only cookies are managed by the backend.

## Temporary cold-load strategy

The backend contract has no current-user (`/auth/me`) endpoint. On a cold load
under `/dashboard`, the provider calls the user refresh endpoint. Under `/admin`
(including `/admin/login`), it calls the admin refresh endpoint. Other public
routes start anonymous. A successful refresh hydrates only `userId`, `email`,
`name`, and `role`; failure leaves the session anonymous. Guards show a loading
boundary until bootstrap settles and never guess the user's role.

This workaround rotates the refresh token on every protected cold load. React
StrictMode's effect replay shares the bootstrap Promise, and explicit refreshes
share the existing coordinator with interceptor-triggered refreshes. When the
backend adds a documented current-user endpoint, replace the provider's bootstrap
request while retaining the Context API; do not invent that endpoint now.

User routes accept `User`; admin routes accept the documented issued roles `Admin`
and `SuperAdmin`. Middleware bypass labels (`SystemAdmin`) and the entity comment's
`Support` label do not establish additional frontend login roles.

Invalid login credentials are displayed without trying token refresh. A
new login waits for an existing rotation to finish before sending credentials,
so a late refresh response cannot overwrite the new login's cookies. A
single-session mismatch immediately clears identity and redirects through the
auth guard without a refresh loop. The account menu invokes the logout endpoint
for the active session realm; it waits for any existing rotation first. On a
successful logout it clears identity and prevents stale refresh hydration.
An ordinary backend logout failure is shown to the user and leaves identity
intact unless the backend also signals session expiry.

## Backend logout limitation

Both logout controllers read `Request.Cookies["refreshToken"]`, while the issued
cookie is named `X-Refresh-Token`. The contract confirms this bug prevents correct
refresh-token revocation. The frontend calls the real documented endpoints and
handles their response; it cannot guarantee database revocation or repair cookie
handling. The backend must use the correct cookie name/token service. No cookie
access or frontend revocation workaround is implemented.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
Auth tests use the real service, provider, coordinator, forms, and route guards
with a test-only Axios adapter and a DOM environment; no live backend is contacted.
