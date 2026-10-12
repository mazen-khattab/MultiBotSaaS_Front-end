# Authentication and session bootstrap (Part 8)

AuthProvider retains the established context API and holds only identity in memory.
On a cold load under /dashboard it calls GET /api/v1/auth/me. Under /admin,
including /admin/login, it calls GET /api/v1/admin/auth/me. Other public routes
start anonymous. StrictMode shares one bootstrap Promise. Healthy reloads do not
rotate tokens. Only userId, email, name, and the documented role enter auth state.

A genuine 401 from /me still uses the existing coordinated refresh interceptor,
then replays /me. A single-session mismatch skips refresh and clears identity.
Concurrent expired requests share one rotation. Login and logout retain action
version checks and wait for any pending rotation, so stale responses cannot undo
new authentication actions. Guards wait until identity restoration settles.

Logout continues to POST /api/v1/auth/logout or /api/v1/admin/auth/logout. The V2
backend now revokes X-Refresh-Token correctly and clears both HTTP-only cookies.
The frontend never reads cookies or persists JWTs in JavaScript. Ordinary logout
failures preserve authenticated state and show a safe message.

User routes accept User; admin routes accept Admin and SuperAdmin. No additional
roles or permissions are inferred from display names or middleware bypass labels.

Validate with npm run typecheck, npm run lint, npm test, and npm run build. Tests
cover user/admin login and reload, healthy and expired /me, StrictMode, logout,
refresh races, route guards, and rejected identities using test-only HTTP adapters.
