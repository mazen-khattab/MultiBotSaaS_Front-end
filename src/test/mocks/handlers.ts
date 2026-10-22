import { http, HttpResponse } from "msw/http"

import { accountDetailsDto, accountDto, messagingAccountDto, adminIdentity, apiOrigin, apiPage, apiSuccess,
  botDto, groupDetailsDto, groupDto, leadDto, leadDetailsDto, userIdentity } from "@/test/fixtures/api.fixtures"

/** Exact existing endpoints only. Tests override these with server.use(); no
 * worker callback, future interface, fallback wildcard or fake business store. */
export const handlers = [
  http.post(`${apiOrigin}/api/v1/auth/login`, () => HttpResponse.json(apiSuccess(userIdentity))),
  http.get(`${apiOrigin}/api/v1/auth/me`, () => HttpResponse.json(apiSuccess(userIdentity))),
  http.post(`${apiOrigin}/api/v1/auth/refresh`, () => HttpResponse.json(apiSuccess(userIdentity))),
  http.post(`${apiOrigin}/api/v1/auth/logout`, () => HttpResponse.json(apiSuccess(null))),
  http.post(`${apiOrigin}/api/v1/admin/auth/login`, () => HttpResponse.json(apiSuccess(adminIdentity))),
  http.get(`${apiOrigin}/api/v1/admin/auth/me`, () => HttpResponse.json(apiSuccess(adminIdentity))),
  http.post(`${apiOrigin}/api/v1/admin/auth/refresh`, () => HttpResponse.json(apiSuccess(adminIdentity))),
  http.post(`${apiOrigin}/api/v1/admin/auth/logout`, () => HttpResponse.json(apiSuccess(null))),
  http.get(`${apiOrigin}/api/v1/bots`, () => HttpResponse.json(apiSuccess([botDto]))),
  http.get(`${apiOrigin}/api/v1/bots/subscribed`, () => HttpResponse.json(apiSuccess([botDto]))),
  http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/scraping/73`, () => HttpResponse.json(apiSuccess([accountDto]))),
  http.get(`${apiOrigin}/api/v1/connectedaccounts/eligible/messaging/73`, () => HttpResponse.json(apiSuccess([messagingAccountDto]))),
  http.get(`${apiOrigin}/api/v1/connectedaccounts/73`, () => HttpResponse.json(apiSuccess([accountDto]))),
  http.get(`${apiOrigin}/api/v1/connectedaccounts/73/12`, () => HttpResponse.json(apiSuccess(accountDetailsDto))),
  http.get(`${apiOrigin}/api/v1/TargetGroups/73`, () => HttpResponse.json(apiSuccess([groupDto]))),
  http.get(`${apiOrigin}/api/v1/TargetGroups/73/5`, () => HttpResponse.json(apiSuccess(groupDetailsDto))),
  http.get(`${apiOrigin}/api/v1/leads/leads/73`, ({ request }) => {
    const params = new URL(request.url).searchParams
    return HttpResponse.json(apiSuccess(apiPage([leadDto], Number(params.get("pageNumber") ?? 1))))
  }),
  http.get(`${apiOrigin}/api/v1/Leads/101`, () => HttpResponse.json(apiSuccess(leadDetailsDto))),
]
