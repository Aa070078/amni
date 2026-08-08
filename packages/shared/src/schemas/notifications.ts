import { z } from "zod";

export const notificationTypeSchema = z.enum(["info", "success", "warning", "alert", "system"]);

export const NOTIFICATION_TYPES = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "alert", label: "Alert" },
  { value: "system", label: "System" },
] as const;

export const notificationSchema = z.object({
  id: z.string().min(1).max(64),
  type: notificationTypeSchema,
  title: z.string().min(1).max(160),
  body: z.string().max(400).optional(),
  href: z.string().max(500).optional(),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const notificationsResponseSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
});

export const notificationsListQuerySchema = z.object({
  unreadOnly: z.enum(["true", "false"]).optional(),
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;
export type NotificationsListQuery = z.infer<typeof notificationsListQuerySchema>;

export const globalSearchResultSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  subtitle: z.string().max(200).optional(),
  type: z.enum(["customer", "supplier", "product", "lead", "quotation", "sales_order", "sales_invoice", "purchase_order", "purchase_invoice", "expense", "payment", "warehouse", "member"]),
  href: z.string().max(500),
  meta: z.string().max(80).optional(),
});

export const globalSearchGroupSchema = z.object({
  label: z.string().min(1).max(60),
  results: z.array(globalSearchResultSchema),
});

export const globalSearchResponseSchema = z.object({
  query: z.string(),
  groups: z.array(globalSearchGroupSchema),
});

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export type NotificationSearchType = z.infer<typeof globalSearchResultSchema>["type"];
export type GlobalSearchResult = z.infer<typeof globalSearchResultSchema>;
export type GlobalSearchGroup = z.infer<typeof globalSearchGroupSchema>;
export type GlobalSearchResponse = z.infer<typeof globalSearchResponseSchema>;
export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;
