# FRONTEND_BACKEND_CONTRACT.md
> **Purpose:** Production-grade frontend integration contract for the MultiBotSaaS platform.
> **Generated from:** Full codebase inspection of all controllers, DTOs, entities, enums, services, hubs, and middlewares.
> **Do NOT guess anything not in this document.** All `Not Found / Needs Clarification` entries must be resolved in the backend before building the frontend for that feature.

---

## Table of Contents

1. [API General Configuration](#1-api-general-configuration)
2. [Authentication & Session Contract](#2-authentication--session-contract)
3. [Authorization & Roles](#3-authorization--roles)
4. [Standard API Response & Error Contract](#4-standard-api-response--error-contract)
5. [Pagination, Filtering, Sorting & Search](#5-pagination-filtering-sorting--search)
6. [Client Dashboard APIs](#6-client-dashboard-apis)
7. [Bot Workspace APIs](#7-bot-workspace-apis)
8. [Runs / Jobs Contract](#8-runs--jobs-contract)
9. [Connected Accounts Contract](#9-connected-accounts-contract)
10. [Leads / Scraped Data Contract](#10-leads--scraped-data-contract)
11. [RAG / Customer Service APIs](#11-rag--customer-service-apis)
12. [Admin Dashboard APIs](#12-admin-dashboard-apis)
13. [SignalR Contract](#13-signalr-contract)
14. [Enums](#14-enums)
15. [Date, Time & Serialization Rules](#15-date-time--serialization-rules)
16. [File Upload / Download Contract](#16-file-upload--download-contract)
17. [Rate Limits, Cooldowns & Quotas](#17-rate-limits-cooldowns--quotas)
18. [Current Backend Feature Matrix](#18-current-backend-feature-matrix)
19. [Frontend Integration Notes](#19-frontend-integration-notes)
20. [Missing / Ambiguous Backend Contracts](#20-missing--ambiguous-backend-contracts)

---

## 1. API General Configuration

### Base URL

| Environment | Base URL |
|---|---|
| Development (HTTP) | `http://localhost:5037` |
| Development (HTTPS) | `https://localhost:7062` |
| Production | **Not Found / Needs Clarification** — no production URL is defined in source files |

### API Versioning Strategy

The API uses **URL path versioning**. All frontend-facing routes are prefixed with `/api/v1/`.

```
/api/v1/<controller>/<action>
```

> **Exception:** The `LeadsController` uses a **non-versioned** route prefix (`api/[controller]`) — this is a confirmed inconsistency in the codebase. See [Section 20](#20-missing--ambiguous-backend-contracts).

### Global Route Prefixes

| Controller | Route Prefix |
|---|---|
| AuthController | `api/v1/auth` |
| AdminAuthController | `api/v1/admin/auth` |
| ConnectedAccountsController | `api/v1/connectedaccounts` |
| TargetGroupsController | `api/v1/targetgroups` |
| RunsController | `api/v1/runs` |
| WorkerController | `api/v1/worker` |
| ReportsController | `api/v1/reports` |
| LeadsController | `api/leads` *(inconsistency — no v1 prefix)* |

### Content-Type Conventions

- All request bodies: `application/json`
- All responses: `application/json`
- Exception middleware serializes errors with: `JsonNamingPolicy.CamelCase`
- Circular reference handling: `ReferenceHandler.IgnoreCycles` — navigation properties that would create circular loops are ignored in JSON output

### Authentication / Credentials

- **All protected endpoints require `credentials: "include"` in Axios/fetch** because authentication is fully cookie-based (HTTP-only cookies).
- No `Authorization: Bearer <token>` header should ever be set manually by the frontend. The JWT is embedded in the `X-Access-Token` cookie and is read by the server automatically via `JwtBearerEvents.OnMessageReceived`.

### CORS Configuration

Configured via the `"FrontendPolicy"` named policy. The following origins are explicitly allowed:

```
http://localhost:5173    (Vite dev server — primary frontend dev origin)
http://localhost:3000
https://mazenkhtab321.app.n8n.cloud
https://mazenkhtab321.app.n8n.cloud/webhook-test
https://mazenkhtab321.app.n8n.cloud/webhook-test/5c2de115-1f5c-41ab-a572-be60392aea3f
```

- `AllowAnyHeader()` ✅
- `AllowAnyMethod()` ✅
- `AllowCredentials()` ✅ — **required for cookies to work cross-origin**

> **Production note:** The n8n cloud origin is whitelisted for webhook delivery. The production frontend domain must be added before deployment.

### Standard Request Headers (Frontend-Facing)

| Header | Value | Required By |
|---|---|---|
| `Content-Type` | `application/json` | All POST/PUT requests |
| *(no Authorization header)* | — | Auth is cookie-based |

### Special / Internal Headers (NOT set by frontend)

| Header | Set By | Purpose |
|---|---|---|
| `x-worker-api-key` | Node.js Playwright worker | Authorizes worker-to-API calls on `WorkerController` |
| `X-Webhook-Secret` | n8n webhook | Authorizes n8n callbacks to `POST /api/v1/runs/{id}/complete` |

The frontend **must never** set these headers.

### X-Idempotency-Key

**Not implemented.** No idempotency key mechanism exists in the backend.

### Development vs Production Differences

| Setting | Development | Production |
|---|---|---|
| Cookie `Secure` flag | `false` | `true` (enforced by `IHostEnvironment.IsProduction()`) |
| Swagger UI | Available at `/` | Available at `/` (also configured in production) |
| Error `Details` field | Populated (stack trace) | `null` |
| Error `InnerException` field | Populated | `null` |
| `requireHttpsMetadata` (JWT) | `true` (hardcoded) | `true` |

---

## 2. Authentication & Session Contract

### Overview

Authentication is **fully cookie-based**. The backend issues two HTTP-only cookies on login and refresh:

| Cookie Name | Content | Lifetime |
|---|---|---|
| `X-Access-Token` | Signed JWT (HMAC-SHA256) | 15 minutes |
| `X-Refresh-Token` | Cryptographically random base64url token | 7 days |

**The frontend never sees the raw token values.** Both cookies are `HttpOnly` and cannot be read by JavaScript.

### Cookie Configuration

| Property | Value |
|---|---|
| `HttpOnly` | `true` |
| `Secure` | `false` in Development / `true` in Production |
| `SameSite` | `Strict` |
| `Path` | `/` (default — not explicitly set) |
| Access token `Expires` | `UtcNow + 15 minutes` |
| Refresh token `Expires` | `UtcNow + 7 days` |

> **SameSite=Strict** means the cookies will **not** be sent on cross-site top-level navigation. Since the frontend is a SPA served from the same origin as the API (or explicitly whitelisted in CORS), this is acceptable. If frontend and backend are on different domains, this setting will block all cross-site cookie delivery.

---

### 2.1 User Login

```
POST /api/v1/auth/login
```

**Request DTO:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response DTO (200 OK) — `ApiResponse<AuthLoginResponseDto>`:**

```json
{
  "isSuccess": true,
  "message": "Login successful.",
  "errorType": 0,
  "data": {
    "userId": "guid-string",
    "email": "string",
    "name": "string",
    "role": "User"
  }
}
```

**Cookies set on success:**
- `X-Access-Token` — JWT, 15 min
- `X-Refresh-Token` — opaque token, 7 days

**What happens internally:**
1. Validates email + password (bcrypt verify).
2. Generates a new `CurrentSessionToken` (GUID) and saves it to the `Users` table.
3. Revokes all prior active refresh tokens for this user.
4. Issues new access + refresh token pair.
5. Writes cookies to the HTTP response.
6. Returns `AuthLoginResponseDto` in response body (does **not** include tokens).

**HTTP Status Codes:**

| Code | Condition |
|---|---|
| 200 OK | Credentials valid, cookies set |
| 401 Unauthorized | Invalid email or password (returns `ApiErrorResponse`) |
| 422 Unprocessable Entity | Validation error (empty fields) |

**Error Response (401):**

```json
{
  "isSuccess": false,
  "statusCode": 401,
  "message": "Invalid credentials.",
  "path": "api/v1/auth/login",
  "method": "POST",
  "traceId": "string"
}
```

---

### 2.2 User Logout

```
POST /api/v1/auth/logout
```

**Auth required:** Yes (`[Authorize]` attribute — valid `X-Access-Token` cookie must be present)

**Request Body:** None

**What happens internally:**
1. Extracts `UserId` from the `ClaimTypes.NameIdentifier` claim.
2. Reads the `refreshToken` cookie (note: reads `"refreshToken"` by name, not `X-Refresh-Token` — see Section 20).
3. Deactivates the refresh token in the database.
4. Clears both auth cookies (`X-Access-Token`, `X-Refresh-Token`).

**Cookies deleted on success:** `X-Access-Token`, `X-Refresh-Token`

**Response DTO (200 OK) — `ApiResponse<bool>`:**

```json
{
  "isSuccess": true,
  "message": "string",
  "errorType": 0,
  "data": true
}
```

**HTTP Status Codes:**

| Code | Condition |
|---|---|
| 200 OK | Logout successful |
| 400 Bad Request | Invalid UserId in claims |
| 401 Unauthorized | No valid access token cookie |

---

### 2.3 User Refresh Token

```
POST /api/v1/auth/refresh
```

**Auth required:** No `[Authorize]` attribute — but the `X-Refresh-Token` cookie must be present.

**Request Body:** None. The refresh token is read from the `X-Refresh-Token` cookie server-side via `ITokenService.GetCookiesRefreshToken()`.

**What happens internally:**
1. Reads `X-Refresh-Token` cookie value.
2. If missing/blank → returns 401 immediately with body `"Refresh token does not exist in cookies"`.
3. Queries `UserRefreshTokens` table for the token.
4. Validates: token exists, `IsActive = true`, `ExpDate > UtcNow`, user not deleted.
5. Generates a new `CurrentSessionToken` (GUID) — new session bound to refresh.
6. Revokes old refresh tokens, issues new pair.
7. Sets new cookies.
8. Returns new `AuthLoginResponseDto`.

**Response DTO (200 OK) — `ApiResponse<AuthLoginResponseDto>`:**

```json
{
  "isSuccess": true,
  "message": "Refresh token successful.",
  "errorType": 0,
  "data": {
    "userId": "guid-string",
    "email": "string",
    "name": "string",
    "role": "User"
  }
}
```

**Cookies refreshed on success:** Both `X-Access-Token` and `X-Refresh-Token` are replaced with new values and new expiry times.

**HTTP Status Codes:**

| Code | Condition |
|---|---|
| 200 OK | New token pair issued |
| 401 Unauthorized | Cookie missing, token not found, token expired, token inactive, user deleted |

---

### 2.4 Refresh Token Rotation Flow (Complete)

```
STEP 1: Access token expires (X-Access-Token cookie reaches 15-min limit)

STEP 2: Next API request returns 401 Unauthorized
        {
          "isSuccess": false,
          "statusCode": 401,
          "message": "..."  OR  {"message": "Your session has expired or ended..."}
        }

STEP 3: Frontend intercepts 401 and calls POST /api/v1/auth/refresh
        (with credentials — browser automatically sends X-Refresh-Token cookie)

STEP 4: If refresh succeeds (200 OK):
        - New X-Access-Token and X-Refresh-Token cookies are written to browser
        - Frontend receives new AuthLoginResponseDto (identity fields only)
        - Frontend retries the original failed request

STEP 5: If refresh fails (401):
        - The refresh token is invalid, expired, revoked, or user is deleted
        - Frontend must clear local auth state and redirect to /login
        - No further retry should be attempted

STEP 6: Concurrent 401s (multiple in-flight requests all fail at once):
        - Frontend must implement a "refresh lock" / queue mechanism
        - Only ONE refresh call should be made
        - All concurrent failed requests should be queued and retried after
          the single successful refresh
        - If refresh fails, all queued requests are rejected and user is logged out

STEP 7: Refresh token reuse / invalid token detection:
        - Backend uses a DB query: token must exist, IsActive=true, not expired
        - If token is not found: 401 "Refresh token invalid or expired."
        - If token is found but IsActive=false: 401 "Refresh token invalid or expired."
        - There is NO explicit "token reuse attack detection" / token family
          revocation in the current implementation
        - A stolen and reused refresh token that is still IsActive=true and
          not expired will succeed (the old one gets deactivated, new one issued)
```

---

### 2.5 Single Active Session Enforcement

The backend enforces **one active session per user**:

- On login or refresh, a new `CurrentSessionToken` (GUID) is generated and saved in the `Users` table.
- The JWT access token embeds this `SessionToken` as a claim.
- `SingleActiveSessionMiddleware` runs on every authenticated request and compares the claim's session token to the value in the database.
- If they differ (another device logged in), the middleware returns:

```json
{
  "message": "Your session has expired or ended because you logged in from another device."
}
```

with HTTP status `401`.

**Frontend must handle this 401 the same way as an expired token: redirect to login.**

---

### 2.6 Admin Login

```
POST /api/v1/admin/auth/login
```

**Request DTO:** Same as user login:

```json
{
  "email": "string",
  "password": "string"
}
```

**Response DTO (200 OK):** Same `ApiResponse<AuthLoginResponseDto>` shape.

```json
{
  "data": {
    "userId": "guid-string",
    "email": "string",
    "name": "string",
    "role": "Admin"  // or "SuperAdmin"
  }
}
```

**Cookies set:** Same `X-Access-Token` + `X-Refresh-Token` cookies, same lifetimes.

**Admin difference:** The `SingleActiveSessionMiddleware` **skips session token validation** for roles `"Admin"`, `"SuperAdmin"`, `"SystemAdmin"`. Admins are not subject to the single-device enforcement.

---

### 2.7 Admin Logout

```
POST /api/v1/admin/auth/logout
```

**Auth required:** Yes (`[Authorize]`)

Behavior is identical to user logout but reads admin refresh token from the `SystemAdminRefreshTokens` table.

> **Bug note:** The admin logout controller reads `Request.Cookies["refreshToken"]` (lowercase, unquoted key) but the cookie is actually stored as `X-Refresh-Token`. See [Section 20](#20-missing--ambiguous-backend-contracts).

---

### 2.8 Admin Refresh Token

```
POST /api/v1/admin/auth/refresh
```

Same flow as user refresh, but queries the `SystemAdminRefreshTokens` table.

---

### 2.9 "Current User" / Session Endpoint

**Not Found / Needs Clarification.** There is no dedicated `GET /api/v1/auth/me` or similar endpoint.

The only user information the frontend can obtain after login is from the `AuthLoginResponseDto.data` field returned by the login/refresh response body. The frontend should persist `{ userId, email, name, role }` in client state (e.g., React Context or Zustand) immediately after login/refresh.

---

### 2.10 Registration

**Not Found / Needs Clarification.** No user registration endpoint exists in the current backend. User accounts are seeded via `UsersSeeding.cs` at startup.

---

### 2.11 Password Reset / Change

**Not Found / Needs Clarification.** No password reset or change endpoint exists.

---

## 3. Authorization & Roles

### Roles

| Role String (in JWT `ClaimTypes.Role`) | Issued by | Purpose |
|---|---|---|
| `"User"` | `UserLoginCommandHandler` / `UserRefreshTokenCommandHandler` | Regular authenticated client |
| `"Admin"` | `AdminLoginCommandHandler` | System administrator (default) |
| `"SuperAdmin"` | SystemAdmin entity `Role` field | Elevated admin (value comes from `SystemAdmin.Role` column) |

> The `SystemAdmin.Role` column has a code comment: *`"SuperAdmin"`, `"Admin"`, `"Support"`*. Only `"Admin"` is seeded by default.

### Session Token Claim (Users Only)

Regular users also carry a `"SessionToken"` custom claim in their JWT. Admins do **not** carry this claim.

### Middleware Role Bypass

The `SingleActiveSessionMiddleware` checks `ClaimTypes.Role` against `["Admin", "SuperAdmin", "SystemAdmin"]`. If the role matches, session validation is skipped entirely.

### Controller-Level Authorization

| Controller | Authorization |
|---|---|
| `AuthController` | Login/Refresh: none. Logout: `[Authorize]` |
| `AdminAuthController` | Login/Refresh: none. Logout: `[Authorize]` |
| `ConnectedAccountsController` | All actions: `[Authorize]` |
| `TargetGroupsController` | All actions: no `[Authorize]` attribute on controller or actions (see Section 20) |
| `RunsController` | `POST /runs`: `[Authorize]`. `POST /runs/{id}/complete`: `[N8nWebhookAuthorize]` (not JWT) |
| `WorkerController` | All actions: `[BotWorkerAuthorize]` (API key header). `POST /dispatch-messaging` additionally requires `[Authorize]` (JWT) |
| `LeadsController` | No `[Authorize]` attribute on controller or any action (see Section 20) |
| `ReportsController` | No authorization |

### Bot Entitlement (UserBot)

Before any bot-scoped operation, the backend calls `IUserBotService.CheckOwnershipAsync(userId, botId)`, which queries the `UserBots` junction table. If the user does not own the bot subscription, the operation returns `404 NotFound` with `"User or bot not found"`.

### Disabled / Deleted Users

- Users have an `IsDeleted` boolean flag (soft delete).
- During login: `Users.FirstOrDefaultAsync(u => u.Email == request.email && !u.IsDeleted)` — deleted users cannot log in.
- During refresh: `dbToken.User.IsDeleted` is checked — deleted users cannot refresh.
- There is **no "disabled" / "suspended" flag** separate from `IsDeleted`.

---

## 4. Standard API Response & Error Contract

### Successful Response Envelope — `ApiResponse<T>`

```json
{
  "isSuccess": true,
  "message": "Human-readable success message",
  "errorType": 0,
  "data": { /* T */ }
}
```

| Field | Type | Notes |
|---|---|---|
| `isSuccess` | `bool` | Always `true` on success |
| `message` | `string` | Human-readable description |
| `errorType` | `int` | Always `0` (`ErrorType.None`) on success |
| `data` | `T \| null` | The response payload |

### Error Response Envelope — `ApiErrorResponse`

```json
{
  "isSuccess": false,
  "statusCode": 404,
  "message": "Human-readable error message",
  "path": "/api/v1/connectedaccounts/99",
  "method": "GET",
  "traceId": "0HNA1234:00000001",
  "details": null,
  "innerException": null
}
```

| Field | Type | Present When |
|---|---|---|
| `isSuccess` | `bool` | Always `false` |
| `statusCode` | `int` | Always |
| `message` | `string` | Always |
| `path` | `string` | Always |
| `method` | `string` | Always |
| `traceId` | `string` | Always (ASP.NET `TraceIdentifier` or `Activity.Current.Id`) |
| `details` | `string \| null` | Development only — contains stack trace |
| `innerException` | `string \| null` | Development only — contains inner exception message |

### HTTP Status Code Mapping

| `ErrorType` | HTTP Status | Scenario |
|---|---|---|
| `None` (0) | 200 | Success |
| `InvalidCredentials` | 401 | Wrong email/password |
| `Unauthorized` | 401 | Token invalid, expired, or session mismatch |
| `NotFound` | 404 | Entity not found |
| `BadRequest` | 400 | Invalid input |
| `InsufficientStock` | 400 | Domain-specific stock rule |
| `ValidationError` | 422 | FluentValidation failure |
| `ConcurrencyConflict` | 409 | DB concurrency conflict (`DbUpdateConcurrencyException`) |
| `TooManyRequests` | 429 | Rate-limited (e.g., run already in progress) |
| `ServerError` | 500 | Unhandled server error |

### Validation Errors (422)

The backend uses FluentValidation through `ValidationBehavior` MediatR pipeline behavior. When validation fails, a `SaaS.Domain.ExceptionTypes.ValidationException` is thrown and caught by `ExceptionMiddleware`, returning:

```json
{
  "isSuccess": false,
  "statusCode": 400,
  "message": "Validation error message string",
  "path": "...",
  "method": "...",
  "traceId": "..."
}
```

> **Note:** The `ExceptionMiddleware` maps `ValidationException` to HTTP 400 (`BadRequest`), while the `ErrorTypeExtensions` maps `ErrorType.ValidationError` to HTTP 422. These are two separate code paths. Structured field-level validation errors (array of `{field, message}`) are **not implemented** — only a single `message` string is returned.

### Unauthorized Errors

Two sources:

1. **JWT middleware (ASP.NET built-in):** Returns bare 401 with no body (before controller runs).
2. **SingleActiveSessionMiddleware:** Returns:
   ```json
   { "message": "Your session has expired or ended because you logged in from another device." }
   ```
   or:
   ```json
   { "message": "Invalid session token." }
   ```
   with HTTP 401.
3. **Controller-level:** Returns `ApiErrorResponse` with 401.

### Conflict (409)

```json
{
  "isSuccess": false,
  "statusCode": 409,
  "message": "The record was modified by another user. Please reload and try again.",
  ...
}
```

Triggered by `DbUpdateConcurrencyException` — currently only relevant for `Job` entities which have a `[Timestamp]` `RowVersion` column.

---

## 5. Pagination, Filtering, Sorting & Search

Only **one endpoint** currently implements pagination: `GET /api/leads/leads/{botId}`.

### Paginated Request Parameters (query string)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `pageNumber` | `int` | `1` | 1-based page index |
| `pageSize` | `int` | `10` | Items per page |
| `statusFilter` | `string?` | `null` | Filter by lead status string value (e.g., `"Pending"`, `"Completed"`, `"Failed"`) |

### Paginated Response Envelope — `PaginatedResult<T>`

```json
{
  "items": [ /* array of T */ ],
  "totalItems": 150,
  "totalPages": 15,
  "currentPage": 1
}
```

| Field | Type | Notes |
|---|---|---|
| `items` | `T[]` | Current page items |
| `totalItems` | `long` | Total number of matching records |
| `totalPages` | `int` | `Math.Ceiling(totalItems / pageSize)` |
| `currentPage` | `int` | The requested page number |

This `PaginatedResult<T>` is wrapped in `ApiResponse<PaginatedResult<T>>`:

```json
{
  "isSuccess": true,
  "message": "Leads retrieved successfully",
  "errorType": 0,
  "data": {
    "items": [ ... ],
    "totalItems": 150,
    "totalPages": 15,
    "currentPage": 1
  }
}
```

### Sorting

- Leads are **always** sorted by `CreatedAt` descending (`OrderByDescending(l => l.CreatedAt)`).
- **No client-controlled sorting parameter exists.**

### Search

**Not Found / Needs Clarification.** No search/keyword query parameter exists in any endpoint.

### Cursor / Continuation Pagination

**Not implemented.** The `TargetGroup.LastCursor` field exists in the database but is not exposed through any pagination endpoint.

---

## 6. Client Dashboard APIs

### 6.1 Profile / Settings

#### Get User Settings

**Not Found / Needs Clarification.** The `GetUserSettingsQuery` and `ManageUserSettingsCommand` exist in the Application layer but **there is no HTTP controller endpoint exposing them**. No `SettingsController` exists. See [Section 20](#20-missing--ambiguous-backend-contracts).

#### Get User by ID

**Not Found / Needs Clarification.** `GetUserByIdQuery` returns a raw `User?` entity (not a DTO) and is not exposed via any controller.

---

### 6.2 Client Bots

#### Bot Entity

```
SaaS.Domain.Entities.Bot
```

| Field | Type | Notes |
|---|---|---|
| `Id` | `int` | Bot primary key |
| `Name` | `string` | Display name (max 100 chars) |
| `Description` | `string?` | Optional long description |
| `CurrentPrice` | `decimal` | Precision (18,2) |
| `UiModuleCode` | `string` | varchar(50) — frontend module selector |
| `CooldownMinutes` | `int` | Default 180 minutes between runs |
| `IsActive` | `bool` | Whether bot is offered |
| `Status` | `string` | Currently always `"Active"` (same as AccountStatus mapping) |

#### UserBot Entity (Subscription / Entitlement)

```
SaaS.Domain.Entities.UserBot
```

| Field | Type | Notes |
|---|---|---|
| `Id` | `int` | Primary key |
| `UserId` | `Guid` | FK to User |
| `BotId` | `int` | FK to Bot |
| `PurchasePrice` | `decimal` | Price at time of purchase |
| `PurchaseDate` | `DateTime` | UTC |

#### UiModuleCode Values

**Not Found / Needs Clarification.** The `UiModuleCode` field is defined in the `Bot` entity and stored in the database, but no seeding file seeds any `Bot` records. The `UsersSeeding.cs` only seeds `User` and `SystemAdmin` records. **No `Bot` seed data exists in the codebase.** You must inspect the actual database or ask the backend developer what UiModuleCodes have been inserted manually or via a migration not in source control.

#### Bot List / Subscription Endpoints

**Not Found / Needs Clarification.** No controller exists to:
- List available bots (`GET /bots`)
- Get subscribed bots for the current user
- Get a single bot by ID
- Subscribe/purchase a bot
- Activate/deactivate a bot subscription

The `UserBot` table and `Bot` table are used internally for ownership checks (`IUserBotService.CheckOwnershipAsync`) but are not surfaced through any API endpoint.

---

## 7. Bot Workspace APIs

### 7.1 Connected Accounts

See [Section 9](#9-connected-accounts-contract) for full details.

| Endpoint | Method | Route |
|---|---|---|
| Create | POST | `/api/v1/connectedaccounts` |
| Get All | GET | `/api/v1/connectedaccounts` |
| Get By ID | GET | `/api/v1/connectedaccounts/{id}` |
| Update | PUT | `/api/v1/connectedaccounts/{id}` |
| Delete | DELETE | `/api/v1/connectedaccounts/{id}` |

### 7.2 Groups (Target Groups)

See details below. All group endpoints are on `TargetGroupsController`.

| Endpoint | Method | Route |
|---|---|---|
| Create | POST | `/api/v1/targetgroups` |
| Get All | GET | `/api/v1/targetgroups` |
| Get By ID | GET | `/api/v1/targetgroups/{id}` |
| Update | PUT | `/api/v1/targetgroups/{id}` |
| Delete | DELETE | `/api/v1/targetgroups/{id}` |

#### Create Group

```
POST /api/v1/targetgroups
```

**Request DTO — `AddGroupDto`:**

```json
{
  "botId": 1,
  "groupName": "string",
  "groupUrl": "string",
  "configJson": "{}",
  "isActive": true
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `botId` | `int` | Yes | Must be a bot the current user owns |
| `groupName` | `string` | Yes | Display label |
| `groupUrl` | `string` | Yes | URL of the target group/page |
| `configJson` | `string?` | No | JSON string for bot-specific config params; defaults to `"{}"` |
| `isActive` | `bool` | Yes | Whether this group is active |

**Response — `ApiResponse<Guid>`:**

```json
{
  "isSuccess": true,
  "message": "string",
  "errorType": 0,
  "data": "user-guid-here"
}
```

> **Note:** The response `data` field returns the `UserId` (not the new group's ID). This is a design inconsistency. See [Section 20](#20-missing--ambiguous-backend-contracts).

#### Get All Groups

```
GET /api/v1/targetgroups
```

**Response — `ApiResponse<List<GroupDto>>`:**

```json
{
  "isSuccess": true,
  "data": [
    {
      "id": 1,
      "groupName": "string",
      "groupUrl": "string",
      "isActive": true
    }
  ]
}
```

`GroupDto` fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | Group primary key |
| `groupName` | `string` | Display name |
| `groupUrl` | `string` | URL |
| `isActive` | `bool` | Active flag |

#### Get Group by ID

```
GET /api/v1/targetgroups/{id}
```

**Response — `ApiResponse<GroupDetailsDto>`:**

```json
{
  "isSuccess": true,
  "data": {
    "id": 1,
    "groupName": "string",
    "groupURL": "string",
    "configJson": "{}",
    "isActive": true,
    "relatedLeadsCount": 42,
    "runsCount": 5
  }
}
```

> **Note:** The `GroupDetailsDto` field is named `groupURL` (capitalized L) — not `groupUrl`. This is a casing inconsistency compared to `GroupDto.groupUrl`.

#### Update Group

```
PUT /api/v1/targetgroups/{id}
```

**Request DTO — `UpdateGroupDto`:**

```json
{
  "groupName": "string",
  "groupUrl": "string",
  "configJson": "{}",
  "isActive": true,
  "lastCursor": null
}
```

**Response — `ApiResponse<Guid>`** (same as Create — returns UserId, not group ID).

#### Delete Group

```
DELETE /api/v1/targetgroups/{id}
```

**Response — `ApiResponse<Guid>`** (returns UserId).

---

### 7.3 Runs

See [Section 8](#8-runs--jobs-contract) for the complete Runs contract.

### 7.4 Leads

See [Section 10](#10-leads--scraped-data-contract) for the complete Leads contract.

### 7.5 Activity Logs

#### Log Bot Activity (Worker → API)

```
POST /api/v1/worker/activity-log
```

This endpoint is called by the **Node.js Playwright worker**, not the frontend. The frontend does not log activity.

**Activity Log Entity — `BotActivityLog`:**

| Field | Type | Notes |
|---|---|---|
| `id` | `long` | Primary key |
| `correlationId` | `string` | Correlation ID (ties log to a run/job session) |
| `userId` | `Guid?` | Nullable user ID |
| `logLevel` | `string` | `"INFO"`, `"WARN"`, `"ERROR"` |
| `message` | `string` | Log message |
| `stackTrace` | `string?` | Optional stack trace |
| `createdAt` | `DateTime` | UTC creation time |

**Not Found / Needs Clarification:** There is no `GET` endpoint for the frontend to read activity logs. No activity log list/detail endpoint exists.

### 7.6 Messaging Preview

```
GET /api/leads/bot/messaging-preview/{botId}
```

Returns the list of pending leads eligible for messaging dispatch, respecting the daily limit.

**Route param:** `botId` (int)

**Auth:** No `[Authorize]` attribute (see Section 20).

**Response — `ApiResponse<MessagingPreviewResponseDto>`:**

```json
{
  "isSuccess": true,
  "data": {
    "dailyMessageLimit": 30,
    "messagesSent": 5,
    "allowedToProcessCount": 25,
    "leads": [
      {
        "leadId": 1001,
        "leadNumber": "#LED-1001",
        "profileName": "string",
        "profileUrl": "string",
        "aiMessage": "string",
        "status": "Pending"
      }
    ]
  }
}
```

---

### 7.7 Dispatch Messaging (Trigger Job)

```
POST /api/v1/worker/dispatch-messaging
```

**Auth:** `[BotWorkerAuthorize]` (API key header) **AND** `[Authorize]` (JWT cookie).

> This endpoint is called by the Node.js worker but also requires a valid user JWT. The worker must pass both the `x-worker-api-key` header AND a valid user access token cookie.

**Request DTO — `DispatchMessagingDto`:**

```json
{
  "botId": 1,
  "accountId": 5,
  "leadIds": [1001, 1002, 1003]
}
```

**Response — `ApiResponse<DispatchMessagingResultDto>`:**

```json
{
  "isSuccess": true,
  "data": {
    "jobId": 9001,
    "status": "Pending",
    "totalLeadsCount": 3
  }
}
```

---

### 7.8 Knowledge Base / RAG / Conversations / Prompt Settings / Chat Playground

**Not Found / Needs Clarification.** None of these features are implemented in the current backend. See [Section 11](#11-rag--customer-service-apis).

---

## 8. Runs / Jobs Contract

### 8.1 Create Run (Start)

```
POST /api/v1/runs
```

**Auth:** `[Authorize]` (JWT cookie required)

**Request DTO — `CreateRunDto`:**

```json
{
  "botId": 1,
  "connectedAccountId": 5,
  "targetGroupId": 3,
  "infoJson": "{}"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `botId` | `int` | Yes | Must be a bot the user owns |
| `connectedAccountId` | `int` | Yes | Must belong to the user and be in `"Active"` status |
| `targetGroupId` | `int?` | No | Nullable — some bots may not require a target group |
| `infoJson` | `string` | Yes | JSON string for bot-specific run metadata |

**Validation and Business Rules (in `CreateRunCommandHandler`):**

1. User must own the bot (`UserBots` table check).
2. The `ConnectedAccount` must exist and belong to the user.
3. The account's `Status` must be exactly `"Active"` — otherwise returns 422 with `"Account is currently {status} and cannot be used."`.
4. If the previous run for this user+bot has `EndedAt == null` (still running), returns 429 `"The previous run is still in progress."`.
5. If the cooldown period (`account.Bot.CooldownMinutes`) since the last run's `EndedAt` has not elapsed, returns 429 with the next available time.
6. On success, the account's status is set to `"Busy"` before the run is dispatched to the external system.

**Response — `ApiResponse<int>`:**

```json
{
  "isSuccess": true,
  "message": "Run started successfully.",
  "errorType": 0,
  "data": 42
}
```

`data` = the new `Run.Id` (int).

**HTTP Status Codes:**

| Code | Condition |
|---|---|
| 200 OK | Run created and dispatched |
| 401 Unauthorized | Not authenticated |
| 404 Not Found | Bot not owned, or account not found |
| 422 Unprocessable Entity | Account not active |
| 429 Too Many Requests | Previous run still running or cooldown active |
| 500 Server Error | External system dispatch failed |

---

### 8.2 Complete Run (Webhook — NOT called by frontend)

```
POST /api/v1/runs/{id}/complete
```

**Auth:** `[N8nWebhookAuthorize]` — requires `X-Webhook-Secret` header matching server config. **Frontend never calls this.**

**Request DTO — `CompleteRunDto`:**

```json
{
  "extractedLeads": [
    {
      "externalId": "string",
      "username": "string",
      "fullName": "string",
      "aiMessage": "string",
      "metadataJson": "{}"
    }
  ]
}
```

**What happens:**
1. Run must exist and be in `"Running"` status.
2. Deduplicates incoming leads by `ExternalId` against existing leads for the same `UserId`.
3. Persists new unique leads.
4. Sets `Run.Status = "Completed"`, `Run.CollectedLeadsCount`, `Run.EndedAt`.
5. If account was `"Busy"`, resets it to `"Active"`.
6. Fires `RunCompleted` SignalR event to the user.

---

### 8.3 Get Run / Get Runs List

**Not Found / Needs Clarification.** No `GET /api/v1/runs` or `GET /api/v1/runs/{id}` endpoint exists. The frontend cannot query run status or run history through the API. Run status updates are received via SignalR events only. See [Section 20](#20-missing--ambiguous-backend-contracts).

---

### 8.4 Stop / Cancel Run

**Not Found / Needs Clarification.** No cancel/stop endpoint exists.

---

### 8.5 Retry Run

**Not Found / Needs Clarification.** No retry endpoint exists.

---

### 8.6 Run Entity Fields

| Field | Type | Notes |
|---|---|---|
| `Id` | `int` | Primary key |
| `UserId` | `Guid` | Owner user |
| `BotId` | `int?` | FK to Bot |
| `GroupId` | `int?` | FK to TargetGroup |
| `AccountId` | `int?` | FK to ConnectedAccount |
| `CollectedLeadsCount` | `int` | Count of new unique leads saved |
| `InfoJson` | `string` | `"{}"` by default — passed from `CreateRunDto.InfoJson` |
| `StartedAt` | `DateTime` | UTC |
| `EndedAt` | `DateTime?` | UTC, null while running |
| `Status` | `string` | `"Running"`, `"Pending"`, `"Completed"`, `"Failed"` |

### 8.7 Run Status Values (Serialized Strings)

| Enum Value | Serialized String |
|---|---|
| `RUNNING` | `"Running"` |
| `PENDING` | `"Pending"` |
| `COMPLETED` | `"Completed"` |
| `FAILED` | `"Failed"` |

### 8.8 Job Entity Fields

| Field | Type | Notes |
|---|---|---|
| `Id` | `long` | Primary key |
| `UserId` | `Guid` | Owner user |
| `BotId` | `int?` | FK to Bot |
| `Type` | `string` | Job type: currently only `"Messaging"` |
| `PayloadJson` | `string` | Job payload JSON |
| `Status` | `string` | `"Pending"`, `"Processing"`, `"Completed"`, `"Failed"` |
| `CreatedAt` | `DateTime` | UTC |
| `RowVersion` | `byte[]` | Optimistic concurrency — not exposed to frontend |

### 8.9 Job Status Values (Serialized Strings)

| Enum Value | Serialized String |
|---|---|
| `PENDING` | `"Pending"` |
| `PROCESSING` | `"Processing"` |
| `COMPLETED` | `"Completed"` |
| `FAILED` | `"Failed"` |

### 8.10 Watchdog Services (Background — Not API)

Two background services run on the server:

**AccountCooldownWatchdogService:** Runs every 15 minutes. Checks `CoolingDown` accounts and resets them to `Active` after the cooldown period (`GeneralSettings.AccountCooldownperiodDays`).

**JobTimeoutWatchdogService:** Runs every 1 minute. Checks `Processing` jobs that exceed `JobWatchdogOptions.TimeoutThresholdMinutes` and marks them as `Failed`. Fires `JobFailed` SignalR event.

### 8.11 Bot-Specific Run Information

The `Run.InfoJson` field is a free-form JSON string passed in `CreateRunDto.InfoJson` by the frontend. The backend stores it as-is and does **not parse or validate it**. The schema of `InfoJson` is bot-specific and **Not Found / Needs Clarification** for each `UiModuleCode`.

The `Run.CollectedLeadsCount` field captures how many new unique leads were collected by the run.

---

## 9. Connected Accounts Contract

### 9.1 Create Connected Account

```
POST /api/v1/connectedaccounts
```

**Auth:** `[Authorize]` (JWT cookie)

**Request DTO — `AddConnectedAccountDto`:**

```json
{
  "botId": 1,
  "displayName": "My Facebook Account",
  "platform": "Facebook",
  "cookies": "raw-cookie-string-here"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `botId` | `int` | Yes | Must be a bot the user owns |
| `displayName` | `string` | Yes | Human-readable label |
| `platform` | `string` | Yes | Platform name (e.g., `"Facebook"`) |
| `cookies` | `string` | Yes | **Raw plaintext cookie string** — the backend encrypts this using AES-256 before storing |

> **Security note:** The frontend submits raw cookie strings over HTTPS. The backend immediately encrypts them server-side using `IEncryptionService.Encrypt()` (AES-256 with the `SecuritySettings.EncryptionKey`). Cookies are never stored in plaintext.

The cookie expiry is hardcoded to `UtcNow + 7 days`.

**Response — `ApiResponse<Guid>`:**

```json
{
  "isSuccess": true,
  "message": "Connected account has been added successfully",
  "errorType": 0,
  "data": "user-guid"
}
```

`data` = the `UserId` (not the new account's ID).

---

### 9.2 Get All Connected Accounts

```
GET /api/v1/connectedaccounts
```

**Auth:** `[Authorize]` (JWT cookie)

**Response — `ApiResponse<List<ConnectedAccountDto>>`:**

```json
{
  "isSuccess": true,
  "data": [
    {
      "id": 5,
      "displayName": "My Facebook Account",
      "platform": "Facebook",
      "expiredAt": "2026-08-15T10:00:00Z",
      "isActive": true
    }
  ]
}
```

`ConnectedAccountDto` fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | Account primary key |
| `displayName` | `string` | Display label |
| `platform` | `string` | Platform string |
| `expiredAt` | `DateTime` | Cookie expiry (UTC) |
| `isActive` | `bool` | Active flag |

> **Note:** `Status` (Active/Busy/CoolingDown/etc.) is **not** included in the list DTO. Only `isActive` is exposed.

---

### 9.3 Get Connected Account by ID

```
GET /api/v1/connectedaccounts/{id}
```

**Route param:** `id` (int)

**Response — `ApiResponse<ConnectedAccountDetailsDto>`:**

```json
{
  "isSuccess": true,
  "data": {
    "id": 5,
    "displayName": "My Facebook Account",
    "platform": "Facebook",
    "maskedCookies": "sk-***...***-abc",
    "expAt": "2026-08-15T10:00:00Z",
    "isActive": true,
    "relatedLeadsCount": 120,
    "runsCount": 8
  }
}
```

`ConnectedAccountDetailsDto` fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | Account ID |
| `displayName` | `string` | Display name |
| `platform` | `string` | Platform |
| `maskedCookies` | `string` | Decrypted and masked cookie value (never full value) |
| `expAt` | `DateTime` | Cookie expiry (note: field is `expAt`, not `expiredAt`) |
| `isActive` | `bool` | Active flag |
| `relatedLeadsCount` | `int` | Total leads for this account |
| `runsCount` | `int` | Total runs for this account |

---

### 9.4 Update Connected Account

```
PUT /api/v1/connectedaccounts/{id}
```

**Route param:** `id` (int)

**Request DTO — `UpdateConnectedAccountDto`:**

```json
{
  "displayName": "string",
  "platform": "string",
  "encryptedCookies": "string",
  "status": "Active",
  "isActive": true
}
```

> **Important:** The `UpdateConnectedAccountDto.encryptedCookies` field name is misleading — it accepts the raw cookie string which the backend then re-encrypts. The frontend should send the **raw plaintext** cookie string in this field.

**Response — `ApiResponse<Guid>`** (returns UserId).

---

### 9.5 Delete Connected Account

```
DELETE /api/v1/connectedaccounts/{id}
```

**Route param:** `id` (int)

**Response — `ApiResponse<Guid>`** (returns UserId).

---

### 9.6 Account Status

| Serialized Value | Meaning |
|---|---|
| `"Active"` | Ready for use |
| `"Busy"` | Currently executing a run |
| `"CoolingDown"` | In cooldown after a run |
| `"AccountFlagged"` | Platform flagged the account |
| `"Banned"` | Account is banned |

Status transitions are managed server-side (by the watchdog, by the worker, or by the run system). The frontend can set `status` in the update DTO but the backend handler may apply additional business rules.

---

### 9.7 Account Cooldown

The `AccountCooldownWatchdogService` runs every 15 minutes and resets accounts in `"CoolingDown"` status to `"Active"` if their cooldown period (configured in `GeneralSettings.AccountCooldownperiodDays`) has elapsed.

---

## 10. Leads / Scraped Data Contract

### 10.1 Get All Leads

```
GET /api/leads/leads/{botId}
```

> **Warning:** This endpoint uses a non-versioned route (`api/[controller]` not `api/v1/[controller]`). The URL is `GET /api/leads/leads/{botId}`, **not** `GET /api/v1/leads/{botId}`.

**Route param:** `botId` (int)

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `pageNumber` | `int` | `1` | Page number (1-based) |
| `pageSize` | `int` | `10` | Items per page |
| `statusFilter` | `string?` | `null` | Filter by status: `"Pending"`, `"Completed"`, `"Failed"` |

**Auth:** No `[Authorize]` attribute (see Section 20).

**Response — `ApiResponse<PaginatedResult<LeadListDto>>`:**

```json
{
  "isSuccess": true,
  "message": "Leads retrieved successfully",
  "data": {
    "items": [
      {
        "leadId": 1001,
        "leadFormattedId": "#LED-1001",
        "profileName": "John Doe",
        "profileUrl": "https://facebook.com/john.doe",
        "aiMessage": "Hi John, ...",
        "fromGroup": "Marketing Group",
        "status": "Pending",
        "createdAt": "2026-08-15T10:00:00Z"
      }
    ],
    "totalItems": 150,
    "totalPages": 15,
    "currentPage": 1
  }
}
```

`LeadListDto` fields:

| Field | Type | Notes |
|---|---|---|
| `leadId` | `long` | Primary key |
| `leadFormattedId` | `string` | `"#LED-{leadId}"` — display-only formatted ID |
| `profileName` | `string` | Scraped profile name |
| `profileUrl` | `string` | Scraped profile URL |
| `aiMessage` | `string` | AI-generated message (empty if none) |
| `fromGroup` | `string` | Source group name (empty if no group) |
| `status` | `string` | `"Pending"`, `"Completed"`, `"Failed"` |
| `createdAt` | `DateTime` | UTC creation time |

---

### 10.2 Lead Detail / Metadata

`LeadDetail.MetaDataJson` contains bot-specific scraped metadata (bios, comments, post context). This is stored as a JSON string.

**Not Found / Needs Clarification.** There is no `GET /api/leads/{leadId}` endpoint to retrieve a single lead with its `MetaDataJson`.

---

### 10.3 Lead Status Values

| Serialized Value | Meaning |
|---|---|
| `"Pending"` | Collected but not yet messaged |
| `"Completed"` | Successfully messaged |
| `"Failed"` | Messaging failed |

---

### 10.4 Lead Deduplication Behavior

When a run completes, the backend deduplicates incoming leads by `ExternalId` scoped to the `UserId`. Duplicate leads are silently dropped. The `CollectedLeadsCount` on the `Run` entity reflects only **new unique** leads saved.

---

### 10.5 Lead Export

**Not Found / Needs Clarification.** No export endpoint (CSV, Excel, etc.) exists.

---

### 10.6 Messaging Preview

```
GET /api/leads/bot/messaging-preview/{botId}
```

See [Section 7.6](#76-messaging-preview) for full details.

---

## 11. RAG / Customer Service APIs

**Not Found / Needs Clarification.** The `CUSTOMER_SERVICE_RAG` UiModuleCode (if it exists) and all associated features are **not implemented** in the current backend:

- Knowledge base management (list, upload, delete)
- Document processing / indexing status
- RAG conversations and messages
- Prompt settings
- Chat playground / testing

None of these controllers, handlers, DTOs, or entities exist in the codebase.

---

## 12. Admin Dashboard APIs

### 12.1 Admin Authentication

See [Section 2.6](#26-admin-login), [2.7](#27-admin-logout), [2.8](#28-admin-refresh-token).

### 12.2 Admin User Management

**Not Found / Needs Clarification.** No admin endpoints for user management exist:
- List users: Not implemented
- Get user: Not implemented
- Create user: Not implemented
- Update user: Not implemented
- Delete/deactivate user: Not implemented

### 12.3 Admin Bot Management

**Not Found / Needs Clarification.** No admin endpoints for bot management exist.

### 12.4 Admin Plans / Subscriptions / Transactions

**Not Found / Needs Clarification.** No admin endpoints for plans, subscriptions, or transaction management exist. The `Transaction` entity is defined in the domain but not exposed through any API.

### 12.5 Admin Audit Logs

**Not Found / Needs Clarification.** No admin endpoint for reading `BotActivityLog` records exists.

### 12.6 Admin System Configuration

**Not Found / Needs Clarification.** No admin endpoints for system configuration exist.

---

## 13. SignalR Contract

### 13.1 Hub Overview

| Hub Class | URL | Authentication |
|---|---|---|
| `AppNotificationHub` | `/hubs/notifications` | `[Authorize]` — JWT cookie |

### 13.2 Connection Requirements

- The SignalR connection **requires** a valid `X-Access-Token` cookie.
- The JWT bearer configuration reads the access token from the `X-Access-Token` cookie via `JwtBearerEvents.OnMessageReceived`. The same mechanism applies to SignalR connections — no additional configuration is needed.
- The `Context.UserIdentifier` is derived from `ClaimTypes.NameIdentifier` (the user's GUID string).

### 13.3 Authentication Mechanism

When the frontend creates a SignalR connection:
1. The browser automatically includes all cookies with the request (including `X-Access-Token`).
2. The server's JWT bearer middleware reads the token from the cookie (not from a query string or header).
3. **No additional auth headers or query parameters are required for SignalR.**

### 13.4 Reconnection

**Not Found / Needs Clarification.** The server does not configure custom SignalR reconnection behavior. The frontend should implement its own reconnection strategy using the SignalR client's built-in `withAutomaticReconnect()`.

If the access token expires while the SignalR connection is open, the connection will be dropped on the next keep-alive or message attempt. The frontend should intercept the disconnect, call the refresh endpoint, and reconnect.

---

### 13.5 Server-to-Client Events

#### `RunCompleted`

| Property | Value |
|---|---|
| **Event name** | `"RunCompleted"` |
| **Fired when** | Run transitions from `"Running"` to `"Completed"` (triggered by `POST /api/v1/runs/{id}/complete`) |
| **Sent to** | The specific user who owns the run (`Clients.User(userId.ToString())`) |
| **Scoped by** | `UserId` |

**Payload:**

```json
{
  "runId": 42,
  "leadsCount": 15
}
```

| Field | Type | Notes |
|---|---|---|
| `runId` | `int` | The completed run's ID |
| `leadsCount` | `int` | Number of **new unique** leads collected |

---

#### `LeadStatusUpdated`

| Property | Value |
|---|---|
| **Event name** | `"LeadStatusUpdated"` |
| **Fired when** | A lead's status is updated by the worker (via `PUT /api/v1/worker/leads/{leadId}/status`) |
| **Sent to** | The specific user who owns the lead (`Clients.User(userId.ToString())`) |
| **Scoped by** | `UserId` |

**Payload:**

```json
{
  "leadId": 1001,
  "status": "Completed"
}
```

| Field | Type | Notes |
|---|---|---|
| `leadId` | `long` | The lead's primary key |
| `status` | `string` | New status string: `"Pending"`, `"Completed"`, or `"Failed"` |

---

#### `JobFailed`

| Property | Value |
|---|---|
| **Event name** | `"JobFailed"` |
| **Fired when** | A job is marked as failed by the `JobTimeoutWatchdogService` (timeout) or by the worker |
| **Sent to** | The specific user who owns the job (`Clients.User(userId.ToString())`) |
| **Scoped by** | `UserId` |

**Payload:**

```json
{
  "jobId": 9001,
  "message": "string"
}
```

| Field | Type | Notes |
|---|---|---|
| `jobId` | `long` | The failed job's ID |
| `message` | `string` | Failure reason |

---

### 13.6 Client-to-Server Hub Methods

**None.** The `AppNotificationHub` is receive-only. No client-to-server methods are defined.

---

### 13.7 Events NOT Present (Confirmed)

The following event names do **not exist** in the current implementation:
- `RunStarted`
- `RunProgress`
- `RunFailed`
- `LogReceived`
- `CounterUpdated`
- `WatchdogStatusChanged`
- `AccountStatusChanged`

---

## 14. Enums

All enums are stored and serialized as **plain strings** (Pascal-case). The backend uses extension methods (`ToDbString()`) to map from C# enum values to their stored string representations.

### RunStatus

| C# Enum Value | JSON / DB String |
|---|---|
| `RUNNING` | `"Running"` |
| `PENDING` | `"Pending"` |
| `COMPLETED` | `"Completed"` |
| `FAILED` | `"Failed"` |

### JobStatus

| C# Enum Value | JSON / DB String |
|---|---|
| `PENDING` | `"Pending"` |
| `PROCESSING` | `"Processing"` |
| `COMPLETED` | `"Completed"` |
| `FAILED` | `"Failed"` |

### JobType

| C# Enum Value | JSON / DB String |
|---|---|
| `MESSAGING` | `"Messaging"` |

### AccountStatus (ConnectedAccount)

| C# Enum Value | JSON / DB String |
|---|---|
| `ACTIVE` | `"Active"` |
| `BUSY` | `"Busy"` |
| `COOLING_DOWN` | `"CoolingDown"` |
| `ACCOUNT_FLAGGED` | `"AccountFlagged"` |
| `BANNED` | `"Banned"` |

### LeadStatus

| C# Enum Value | JSON / DB String |
|---|---|
| `PENDING` | `"Pending"` |
| `COMPLETED` | `"Completed"` |
| `FAILED` | `"Failed"` |

### ErrorType (Internal — not sent to frontend as a string)

`errorType` is serialized as an **integer** in `ApiResponse<T>`:

| C# Enum Value | Integer Value | HTTP Status |
|---|---|---|
| `None` | `0` | 200 |
| `InvalidCredentials` | `1` | 401 |
| `Unauthorized` | `2` | 401 |
| `NotFound` | `3` | 404 |
| `InsufficientStock` | `4` | 400 |
| `BadRequest` | `5` | 400 |
| `ConcurrencyConflict` | `6` | 409 |
| `ValidationError` | `7` | 422 |
| `TooManyRequests` | `8` | 429 |
| `ServerError` | `9` | 500 |

### UserRole (Serialized in JWT `role` claim)

| Value | Source | Notes |
|---|---|---|
| `"User"` | Hardcoded in `TokenService.GenerateAccessToken` | All regular users |
| `"Admin"` | `SystemAdmin.Role` column value | Default admin role |
| `"SuperAdmin"` | `SystemAdmin.Role` column value | Elevated admin |

### LogLevel (BotActivityLog)

| Value | Notes |
|---|---|
| `"INFO"` | Informational |
| `"WARN"` | Warning |
| `"ERROR"` | Error |

---

## 15. Date, Time & Serialization Rules

### Date Format

All `DateTime` values are stored and returned as **UTC** ISO 8601 strings:

```
"2026-08-15T10:00:00Z"
```

ASP.NET Core's default `System.Text.Json` serializer outputs `DateTime` in round-trip format (`"O"` or ISO 8601 with `Z` suffix for UTC). The frontend should always parse dates as UTC and convert to local time for display.

### UTC / Local Behavior

- All `DateTime` values in entities use `DateTime.UtcNow` at creation.
- `ClockSkew = TimeSpan.Zero` — JWT expiry is strict; there is no grace period.
- The `DailyLimitResetHour` in `GeneralSettings` is a **number of hours** (rolling window), not a clock hour. The messaging window is `UtcNow.AddHours(-DailyLimitResetHour)`.

### Enum Serialization

Enums are **not** serialized using `JsonStringEnumConverter`. Instead, the backend uses string DB values throughout (stored as strings in the DB and returned as strings in DTOs). `ErrorType` in `ApiResponse<T>` is the only enum serialized as an integer.

### Nullable Behavior

Nullable fields are omitted from JSON when null if `DefaultIgnoreCondition.WhenWritingNull` is applied (used in `ExceptionMiddleware` error serialization). Regular controller responses use default `System.Text.Json` behavior which includes `null` values.

### GUID Representation

GUIDs are serialized as lowercase hyphenated strings:

```
"a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### JSON Naming Policy

- **Controllers:** Default `System.Text.Json` (camelCase for DTOs serialized to JSON, because `record` properties are PascalCase and `System.Text.Json` camelCases by default).
- **ExceptionMiddleware:** Explicitly uses `JsonNamingPolicy.CamelCase`.
- **Overall:** Expect all JSON keys to be **camelCase**.

### Number / Decimal Representation

`decimal` values (e.g., `Bot.CurrentPrice`, `Transaction.Amount`) are serialized as JSON numbers, not strings. They preserve the `(18, 2)` precision defined in EF configuration.

### Circular Reference Handling

`ReferenceHandler.IgnoreCycles` is configured globally. If a navigation property would create a cycle, it is set to `null` in the output instead of causing an exception.

---

## 16. File Upload / Download Contract

**Not Found / Needs Clarification.** No file upload or download endpoints exist in the current backend. This applies to:
- Knowledge base document uploads (RAG not implemented)
- Lead data export (not implemented)
- Profile picture uploads (not implemented)

---

## 17. Rate Limits, Cooldowns & Quotas

### Run Cooldown

When a user tries to start a new run for a bot where the previous run has not yet satisfied the cooldown period:

**HTTP 429** response:

```json
{
  "isSuccess": false,
  "statusCode": 429,
  "message": "Bot is on cooldown. Next run available in X minutes.",
  "path": "...",
  "method": "POST",
  "traceId": "..."
}
```

The cooldown duration is `Bot.CooldownMinutes` (default 180 minutes = 3 hours).

### Concurrent Run Block

If the previous run's `EndedAt` is `null` (still running):

**HTTP 429** response:

```json
{
  "isSuccess": false,
  "statusCode": 429,
  "message": "The previous run is still in progress. Please wait until it completes.",
  ...
}
```

### Daily Messaging Quota

The `UserSetting.DailyMessageLimit` (default 30) controls how many leads can be messaged in a rolling window defined by `GeneralSettings.DailyLimitResetHour` hours.

This is **not enforced at an HTTP level** — it is enforced within the messaging preview query (`GetAllowedPendingLeadsQuery`). The API returns `AllowedToProcessCount = 0` when the limit is reached, but does not return HTTP 429.

The frontend should check `allowedToProcessCount` before enabling the dispatch button.

### Job Timeout Watchdog

Jobs stuck in `"Processing"` status for longer than `JobWatchdogOptions.TimeoutThresholdMinutes` (default 15 minutes) are automatically marked `"Failed"` by the `JobTimeoutWatchdogService`. A `JobFailed` SignalR event is fired.

### Account Cooldown

Accounts in `"CoolingDown"` status are automatically reset to `"Active"` by the `AccountCooldownWatchdogService` every 15 minutes, after the `GeneralSettings.AccountCooldownperiodDays` period.

### Rate Limit HTTP Headers

**Not implemented.** No `Retry-After`, `X-RateLimit-*`, or similar headers are returned by any endpoint.

---

## 18. Current Backend Feature Matrix

| Domain | Implemented | Frontend Required | Endpoints |
|---|---|---|---|
| User Auth (Login) | ✅ | ✅ | `POST /api/v1/auth/login` |
| User Auth (Logout) | ✅ | ✅ | `POST /api/v1/auth/logout` |
| User Auth (Refresh) | ✅ | ✅ | `POST /api/v1/auth/refresh` |
| User Registration | ❌ | ❌ | — |
| Password Reset | ❌ | ❌ | — |
| User Profile (GET) | ❌ | ✅ | — |
| User Settings (GET) | ⚠️ Handler exists, no controller | ✅ | — |
| User Settings (PUT) | ⚠️ Handler exists, no controller | ✅ | — |
| Admin Auth (Login) | ✅ | ✅ | `POST /api/v1/admin/auth/login` |
| Admin Auth (Logout) | ✅ | ✅ | `POST /api/v1/admin/auth/logout` |
| Admin Auth (Refresh) | ✅ | ✅ | `POST /api/v1/admin/auth/refresh` |
| Bot List (Client) | ❌ | ✅ | — |
| Bot Subscription List | ❌ | ✅ | — |
| Connected Accounts (CRUD) | ✅ | ✅ | `/api/v1/connectedaccounts` |
| Target Groups (CRUD) | ✅ | ✅ | `/api/v1/targetgroups` |
| Create Run | ✅ | ✅ | `POST /api/v1/runs` |
| Cancel Run | ❌ | ✅ | — |
| Get Runs (list/detail) | ❌ | ✅ | — |
| Run Complete (webhook) | ✅ | ❌ | `POST /api/v1/runs/{id}/complete` |
| Leads (list, paginated) | ✅ | ✅ | `GET /api/leads/leads/{botId}` |
| Lead Detail | ❌ | ✅ | — |
| Lead Export | ❌ | ✅ | — |
| Messaging Preview | ✅ | ✅ | `GET /api/leads/bot/messaging-preview/{botId}` |
| Dispatch Messaging (Job) | ✅ | ⚠️ Worker-only | `POST /api/v1/worker/dispatch-messaging` |
| Job Status Update | ✅ | ❌ | `PUT /api/v1/worker/jobs/{jobId}/status` |
| Lead Status Update | ✅ | ❌ | `PUT /api/v1/worker/leads/{leadId}/status` |
| Account Status Update | ✅ | ❌ | `PUT /api/v1/worker/accounts/{accountId}/status` |
| Activity Log (write) | ✅ | ❌ | `POST /api/v1/worker/activity-log` |
| Activity Log (read) | ❌ | ✅ | — |
| RAG / Knowledge Base | ❌ | ⚠️ If UiModuleCode requires it | — |
| Admin Users (CRUD) | ❌ | ✅ | — |
| Admin Bots (CRUD) | ❌ | ✅ | — |
| Admin Transactions | ❌ | ✅ | — |
| Admin Subscriptions | ❌ | ✅ | — |
| Admin Audit Logs | ❌ | ✅ | — |
| SignalR RunCompleted | ✅ | ✅ | Event: `"RunCompleted"` |
| SignalR LeadStatusUpdated | ✅ | ✅ | Event: `"LeadStatusUpdated"` |
| SignalR JobFailed | ✅ | ✅ | Event: `"JobFailed"` |

---

## 19. Frontend Integration Notes

### Cookies and Credentials

- Axios must be configured globally with `withCredentials: true`.
- Every API request must include credentials so the browser sends the HTTP-only cookies.
- Do NOT manually read or set auth cookie values — they are `HttpOnly` and inaccessible to JavaScript.

### Refresh Token Interceptor

Implement an Axios response interceptor that:
1. Catches all 401 responses.
2. Distinguishes between "no session" (no cookies) and "expired access token" (cookies present but stale).
3. Queues concurrent 401s behind a single refresh call (use a `Promise` lock or `semaphore`).
4. On successful refresh, retries all queued requests.
5. On failed refresh, clears local auth state and redirects to login.

### Session Token Expiry Detection

Two types of 401 should be distinguished:
- `{"message": "Your session has expired or ended because you logged in from another device."}` → Force logout, do not retry refresh.
- Standard 401 with `ApiErrorResponse` → Attempt refresh.

### Bot Entitlement

Before rendering any bot workspace page, the frontend must verify the user owns the bot. Currently, no dedicated endpoint exists to check this. The backend performs the check internally and returns 404 if the user doesn't own the bot. The frontend should treat any 404 from a bot-scoped endpoint as an entitlement failure.

### SignalR Authentication

The SignalR hub at `/hubs/notifications` requires authentication. Connect **after** login with `withCredentials` equivalent for SignalR (the `@microsoft/signalr` client automatically sends cookies on WebSocket upgrade requests in browser environments).

### Route Inconsistency — LeadsController

The `LeadsController` uses the route `api/[controller]` which resolves to `api/leads` (no `v1` prefix). All lead API calls must use:
- `GET /api/leads/leads/{botId}` (not `/api/v1/leads/...`)
- `GET /api/leads/bot/messaging-preview/{botId}` (not `/api/v1/leads/...`)

### TargetGroups Create/Delete Response

`POST /api/v1/targetgroups`, `PUT /api/v1/targetgroups/{id}`, and `DELETE /api/v1/targetgroups/{id}` all return `ApiResponse<Guid>` where `data` is the **user's GUID**, not the group's ID. If the frontend needs the newly created group's ID, it must re-fetch the group list after creation.

### GroupDetailsDto Casing Inconsistency

`GroupDetailsDto.groupURL` uses uppercase `URL` (unlike `GroupDto.groupUrl`). Parse accordingly.

### ConnectedAccountsController — `expiredAt` vs `expAt`

- `ConnectedAccountDto` (list): `expiredAt`
- `ConnectedAccountDetailsDto` (detail): `expAt`

These are different field names for the same cookie expiry date.

### InfoJson / ConfigJson — Bot-Specific Parsing

Both `TargetGroup.ConfigJson` and `Run.InfoJson` are stored as opaque JSON strings. The frontend is responsible for knowing the expected schema based on the `Bot.UiModuleCode`. The backend does not validate or parse these fields.

### Account Must Be Active Before Creating Run

Before showing the "Start Run" button, the frontend should verify the selected connected account has `status = "Active"`. An account with any other status will cause the `POST /api/v1/runs` to fail with 422.

### Worker Endpoints Are Not for the Frontend

All endpoints under `GET/POST/PUT /api/v1/worker/...` require the `x-worker-api-key` header and are called by the Node.js Playwright worker, not the browser. The frontend should never call these endpoints.

### Daily Limit Window

The daily message limit uses a **rolling window** (`UtcNow.AddHours(-DailyLimitResetHour)`) not a calendar day. A user who sends 30 messages at 11 PM must wait until 11 AM the next day (if `DailyLimitResetHour = 12`) before the limit resets.

---

## 20. Missing / Ambiguous Backend Contracts

| # | Missing Item | Why It Matters to Frontend | Backend File to Review |
|---|---|---|---|
| 1 | **No `GET /api/v1/auth/me` endpoint** | Frontend cannot retrieve current user info after a page refresh without re-calling login or relying on local state | `AuthController.cs` — add a `/me` endpoint that reads claims from the current JWT |
| 2 | **No `GET /api/v1/settings` or `PUT /api/v1/settings` controller** | `GetUserSettingsQuery` and `ManageUserSettingsCommand` exist and are fully implemented, but no HTTP controller endpoint exposes them | Create a `SettingsController` in `SaaS.Api/Controllers/v1/` |
| 3 | **No bot list or subscription list endpoint** | Frontend cannot display available bots or a user's subscribed bots | Need `GET /api/v1/bots` and `GET /api/v1/user/bots` endpoints |
| 4 | **No UiModuleCode values in codebase** | Frontend cannot build bot-specific UI without knowing which UiModuleCodes exist | Inspect the database or add bot seeding data with defined `UiModuleCode` values |
| 5 | **No `GET /api/v1/runs` or `GET /api/v1/runs/{id}` endpoint** | Frontend cannot display run history or current run status via polling (relies solely on SignalR) | `RunsController.cs` — add query handler and controller action |
| 6 | **No cancel/stop run endpoint** | Frontend cannot stop a running job | `RunsController.cs` — add `DELETE /api/v1/runs/{id}` or `POST /api/v1/runs/{id}/cancel` |
| 7 | **`LeadsController` missing `[Authorize]`** | Any unauthenticated user can query leads by guessing `botId`. Likely an oversight | `LeadsController.cs` — add `[Authorize]` to both endpoints |
| 8 | **`TargetGroupsController` missing `[Authorize]`** | All group CRUD operations are accessible without authentication | `TargetGroupsController.cs` — add `[Authorize]` to the controller |
| 9 | **Admin logout reads wrong cookie name** | `AdminAuthController.Logout` reads `Request.Cookies["refreshToken"]` but the cookie is named `X-Refresh-Token`. The refresh token will always be null in logout, breaking token revocation | `AdminAuthController.cs` line reading `Request.Cookies["refreshToken"]` — change to `X-Refresh-Token` |
| 10 | **User logout reads wrong cookie name** | Same issue: `AuthController.Logout` reads `Request.Cookies["refreshToken"]` (lowercase key), but the cookie is `X-Refresh-Token`. Token is never revoked on logout | `AuthController.cs` — change to use `ITokenService.GetCookiesRefreshToken()` consistently |
| 11 | **`AddGroupCommand` / `UpdateGroupCommand` responses return `UserId` not group ID** | Frontend cannot use the response to navigate to the newly created/updated group | `AddGroupCommandHandler.cs`, `UpdateGroupCommandHandler.cs` — return the group's `Id` instead of `UserId` |
| 12 | **No `GET /api/v1/leads/{leadId}` single lead endpoint** | Frontend cannot display lead detail view with `MetaDataJson` | `LeadsController.cs` — add GetById action |
| 13 | **No lead export endpoint** | Frontend cannot offer CSV/Excel download of leads | Implement a separate export endpoint |
| 14 | **No activity log read endpoint** | Frontend cannot display a bot activity / run log to the user | Need `GET /api/v1/activity-logs` endpoint |
| 15 | **No admin management endpoints** | Admin dashboard has no backend support | Requires an entire admin API controller layer |
| 16 | **`GroupDetailsDto.groupURL` casing** | `groupURL` (capital L) vs `groupUrl` (lowercase L) across DTOs — inconsistency may cause issues depending on frontend's strict type checking | `GroupDetailsDto.cs` — normalize to `groupUrl` |
| 17 | **`ConnectedAccountDetailsDto.expAt` vs `ConnectedAccountDto.expiredAt`** | Different field names for cookie expiry in list vs detail DTO | Normalize to one name (e.g., `cookiesExpiredAt`) across both DTOs |
| 18 | **No `Retry-After` header on 429 responses** | Frontend cannot know when to retry without parsing the message string | Implement `Retry-After` header in 429 responses |
| 19 | **Production domain not in CORS** | Frontend served from a production domain (not localhost) will be blocked | Update CORS policy in `Program.cs` with the production frontend URL |
| 20 | **SignalR reconnection strategy** | If access token expires during a live SignalR session, the connection drops silently | Define and document the reconnection + re-auth flow |
| 21 | **No `GET /api/v1/connectedaccounts` by botId filter** | Current `GetAll` returns ALL user accounts regardless of bot. Frontend likely needs per-bot filtering | Add a `botId` query parameter to `GetAllConnectedAccountsQuery` |
| 22 | **`UpdateConnectedAccountDto.encryptedCookies` field is misleading** | Field name implies pre-encrypted input but the backend re-encrypts the value; naming will confuse frontend developers | Rename to `cookies` in `UpdateConnectedAccountDto` |
