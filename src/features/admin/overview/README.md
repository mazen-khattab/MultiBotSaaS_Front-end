# Admin overview and system configuration boundary

Users, Bots and UserBot management APIs are available (§§12–14); this overview links
to their real feature pages. Existing admin login, GET `/api/v1/admin/auth/me`,
refresh and logout stay in the established authentication layer. The routes retain
Admin/SuperAdmin guards and the AdminLayout. Backend authentication and active-admin
current-role checks remain authoritative.

Backend capability unavailable: dedicated overview/aggregate metrics and Admin
system configuration APIs (§18). The page shows no fabricated KPIs or totals
inferred from one list page. Regular-user settings (§10) are not system configuration.
Transactions, Admin audit logs and commercial plans/billing also remain unsupported;
see their feature READMEs. No speculative services or DTOs are created for gaps.

Part 25 documents these local feature boundaries only. A centralized capability
matrix is intentionally left to Part 26.
