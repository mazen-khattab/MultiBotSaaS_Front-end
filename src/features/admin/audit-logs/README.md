# Admin audit logs

Backend capability unavailable (contract §18). No Admin audit-log read API exists.
`GET /api/v1/activity-logs` (§11) is restricted to the regular User role and cannot
provide platform-wide audit data. This guarded route makes no requests and renders
an explicit unavailable state. Integration requires an Admin audit API and DTO.
