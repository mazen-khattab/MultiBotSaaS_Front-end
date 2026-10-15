# Admin users

Contract: `docs/FRONTEND_BACKEND_CONTRACT_V2.md` §12. The feature owns its
service, query hooks, paginated table, detail dialogs and create/profile forms.
GET/POST `/api/v1/admin/users`, GET/PUT `/{id}` and PUT `/{id}/deactivate` or
`/{id}/reactivate` are available. Filters are pageNumber, pageSize, search and
isDeleted. `isDeleted` means deactivated; reactivation requires a fresh user login.

All requests use the shared credentialed Axios client and the existing Admin
authentication/refresh flow. Frontend Admin/SuperAdmin guards do not replace the
backend's active-admin/current-role verification. Create passwords are request-only
and are excluded from React Query mutation variables, cached data and error text.

Missing APIs: hard deletion, administrative-account creation, role assignment,
password change/reset and public registration. No controls or services simulate them.
