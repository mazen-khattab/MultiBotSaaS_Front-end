import { z } from "zod";

import {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  type CreateConnectedAccountInput,
  type UpdateConnectedAccountInput,
} from "@/features/connected-accounts/types/connectedAccounts.types";

/** Strip undocumented fields before they reach Query caches or the UI. */
export const connectedAccountListSchema = z
  .object({
    id: z.number().int().positive(),
    displayName: z.string(),
    platform: z.string(),
    expiredAt: z.string(),
    isActive: z.boolean(),
    type: z.enum(ACCOUNT_TYPES),
  })
  .transform(({ expiredAt, ...account }) => ({
    ...account,
    expiresAt: expiredAt,
  }));

// V2 normalized detail expAt to expiredAt. Keep one internal expiry name for
// both reads without reintroducing the historical V1 fields on the wire.
export const connectedAccountDetailSchema = z
  .object({
    id: z.number().int().positive(),
    displayName: z.string(),
    platform: z.string(),
    expiredAt: z.string(),
    isActive: z.boolean(),
    status: z.enum(ACCOUNT_STATUSES).optional(),
    type: z.enum(ACCOUNT_TYPES),
    maskedCookies: z.string(),
    relatedLeadsCount: z.number().int().nonnegative(),
    scrapesCount: z.number().int().nonnegative(),
  })
  .transform(({ expiredAt, scrapesCount, ...account }) => ({
    ...account,
    expiresAt: expiredAt,
    // Preserve the UI's established naming while accepting only the V2 wire key.
    runsCount: scrapesCount,
  }));

/** V2 uses cookiesPayload for both writes; encryption belongs to the backend. */
export function toCreateConnectedAccountDto(input: CreateConnectedAccountInput) {
  return {
    botId: input.botId,
    displayName: input.displayName,
    platform: input.platform,
    cookiesPayload: input.cookiesPayload,
    type: input.type,
  };
}

export function toUpdateConnectedAccountDto(
  input: UpdateConnectedAccountInput,
) {
  return {
    displayName: input.displayName,
    cookiesPayload: input.cookiesPayload,
    isActive: input.isActive,
    platform: input.platform,
    status: input.status,
    type: input.type,
  };
}
