import type { ApiErrorResponse, ApiResponse, PaginatedResult } from "@/core/api/apiTypes"
import type { AuthUser } from "@/services/auth/auth.types"

// These are wire fixtures from V2, not the output of frontend adapters. Keep
// scrapesCount/expiredAt/groupUrl here even when the UI uses different names.
export const apiOrigin = "https://api.test"
export const userIdentity: AuthUser = { userId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", email: "user@example.test", name: "Test User", role: "User" }
export const adminIdentity: AuthUser = { userId: "118d92fb-a1db-42f6-a71d-1c7be8ea8f01", email: "admin@example.test", name: "Test Admin", role: "Admin" }
export const botDto = { id: 73, name: "Test bot", description: null, currentPrice: 10, uiModuleCode: "FB-MEMBERS-SCRAPER",
  cooldownMinutes: 180, isActive: true, status: "Active", isSubscribed: true, subscribedAt: "2026-10-15T12:00:00Z" }
export const eligibleAccountDto = { id: 12, displayName: "Test account", platform: "Facebook", expiredAt: "2026-10-25T14:30:00Z", isActive: true }
export const accountDto = { ...eligibleAccountDto, type: "Scraping" as const }
export const messagingAccountDto = { ...eligibleAccountDto, id: 13, displayName: "Messaging account", type: "Messaging" as const }
export const accountDetailsDto = { ...accountDto, status: "Active", maskedCookies: "c_user=***", relatedLeadsCount: 150, scrapesCount: 14 }
export const groupDto = { id: 5, groupName: "Test group", groupUrl: "https://example.test/groups/5", isActive: true }
export const groupDetailsDto = { ...groupDto, configJson: "{}", relatedLeadsCount: 45, scrapesCount: 3 }
export const leadDto = { leadId: 101, leadFormattedId: "LED-#101", profileName: "Test lead", profileUrl: "https://example.test/profile/101",
  aiMessage: "Hello", fromGroup: "Test group", status: "Pending", createdAt: "2026-10-15T12:00:00Z" }
export const leadDetailsDto = {
  id: 101, botId: 73, groupId: 5, accountId: 12, scrapeId: 66, externalId: "external-profile-101",
  profileName: "Detail recipient", profileUrl: "https://example.test/profile/101",
  aiMessage: "مرحبًا!\n\nشكرًا لتفاعلك معنا.\nنحن سعداء بمساعدتك.", status: "Pending",
  createdAt: "2026-10-21T15:26:13.167", processedAt: null,
  metadataJson: JSON.stringify({ postId: "post-101", postText: "مواصفات الشقة:\nالمساحة: 135 متر مربع", commentText: "سعر", totalPosts: 0, realEstatePosts: 0, percentage: 0, isRealClient: true, reason: "لا توجد منشورات لمزيد من التحليل." }),
}

/** Success/error factories preserve the wire envelope without internal defaults. */
export function apiSuccess<T>(data: T, message = "Success."): ApiResponse<T> {
  return { isSuccess: true, message, errorType: 0, data }
}
export function apiPage<T>(items: T[], currentPage = 1, totalItems = items.length, totalPages = items.length ? 1 : 0): PaginatedResult<T> {
  return { items, currentPage, totalItems, totalPages }
}
export function apiFailure(statusCode: number, message: string, path: string, method = "GET"): ApiErrorResponse {
  return { isSuccess: false, statusCode, message, path, method, traceId: "test-trace" }
}
