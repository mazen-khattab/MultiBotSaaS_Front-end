import { http, HttpResponse } from "msw/http"
import { expect, test } from "vitest"

import { ConnectedAccountsService } from "@/features/connected-accounts/services/ConnectedAccountsService"
import { GroupsService } from "@/features/groups/services/GroupsService"
import { EligibleAccountsService } from "@/features/runs/services/EligibleAccountsService"
import { accountDetailsDto, accountDto, eligibleAccountDto, messagingAccountDto, apiOrigin, apiSuccess, groupDetailsDto, groupDto, userIdentity } from "@/test/fixtures/api.fixtures"
import { server } from "@/test/mocks/server"

test("run and messaging eligibility reads use their separate bot-path endpoints", async () => {
  expect(await EligibleAccountsService.getScrapingEligibleAccounts(73)).toEqual([eligibleAccountDto])
  expect(await EligibleAccountsService.getMessagingEligibleAccounts(73)).toEqual([
    { ...eligibleAccountDto, id: messagingAccountDto.id, displayName: messagingAccountDto.displayName },
  ])
})

test("bot-scoped account reads transform expiredAt and scrapesCount explicitly", async () => {
  const [account] = await ConnectedAccountsService.getAll(73)
  expect(account).toEqual({ id: 12, displayName: accountDto.displayName, platform: "Facebook", expiresAt: accountDto.expiredAt, isActive: true, type: "Scraping" })
  const detail = await ConnectedAccountsService.getById(73, 12)
  expect(detail).toMatchObject({ expiresAt: accountDetailsDto.expiredAt, runsCount: accountDetailsDto.scrapesCount, status: "Active", type: "Scraping" })
  expect(detail).not.toHaveProperty("expiredAt")
  expect(detail).not.toHaveProperty("scrapesCount")
  expect(detail).not.toHaveProperty("expAt")
})

test("group reads keep groupUrl and explicitly transform scrapesCount", async () => {
  expect(await GroupsService.getAll(73)).toEqual([groupDto])
  const detail = await GroupsService.getById(73, 5)
  expect(detail).toEqual({ ...groupDto, configJson: "{}", relatedLeadsCount: 45, runsCount: 3 })
  expect(detail).not.toHaveProperty("groupURL")
  expect(detail).not.toHaveProperty("scrapesCount")
})

test("group writes send groupUrl, excluding internal counts and historical groupURL", async () => {
  const bodies: unknown[] = []
  server.use(
    http.post(`${apiOrigin}/api/v1/targetgroups`, async ({ request }) => { bodies.push(await request.json()); return HttpResponse.json(apiSuccess(userIdentity.userId)) }),
    http.put(`${apiOrigin}/api/v1/targetgroups/5`, async ({ request }) => { bodies.push(await request.json()); return HttpResponse.json(apiSuccess(userIdentity.userId)) }),
  )
  const input = { groupName: "New name", groupUrl: groupDto.groupUrl, configJson: "{}", isActive: false }
  await GroupsService.create({ botId: 73, ...input })
  await GroupsService.update(5, input)
  expect(bodies).toEqual([{ botId: 73, ...input }, input])
})

test("legacy expAt cannot stand in for expiredAt", async () => {
  const { expiredAt, ...withoutExpiry } = accountDto
  server.use(http.get(`${apiOrigin}/api/v1/connectedaccounts/73`, () => HttpResponse.json(apiSuccess([{ ...withoutExpiry, expAt: expiredAt }]))))
  await expect(ConnectedAccountsService.getAll(73)).rejects.toMatchObject({ message: "The server returned an unsupported response." })
})

test("legacy groupURL cannot stand in for groupUrl", async () => {
  const { groupUrl, ...withoutUrl } = groupDto
  server.use(http.get(`${apiOrigin}/api/v1/TargetGroups/73`, () => HttpResponse.json(apiSuccess([{ ...withoutUrl, groupURL: groupUrl }]))))
  await expect(GroupsService.getAll(73)).rejects.toMatchObject({ message: "The server returned an unsupported response." })
})

test("runsCount is an internal model field, never a replacement for either wire scrapesCount", async () => {
  const { scrapesCount: accountCount, ...account } = accountDetailsDto
  const { scrapesCount: groupCount, ...group } = groupDetailsDto
  server.use(
    http.get(`${apiOrigin}/api/v1/connectedaccounts/73/12`, () => HttpResponse.json(apiSuccess({ ...account, runsCount: accountCount }))),
    http.get(`${apiOrigin}/api/v1/TargetGroups/73/5`, () => HttpResponse.json(apiSuccess({ ...group, runsCount: groupCount }))),
  )
  await expect(ConnectedAccountsService.getById(73, 12)).rejects.toMatchObject({ message: "The server returned an unsupported response." })
  await expect(GroupsService.getById(73, 5)).rejects.toMatchObject({ message: "The server returned an unsupported response." })
})
