import { z } from "zod";

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const offsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const searchSchema = z.object({
  q: z.string().trim().max(200).optional(),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;
export type OffsetPagination = z.infer<typeof offsetPaginationSchema>;
export type Sort = z.infer<typeof sortSchema>;

export const pageMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().optional(),
});

export type PageMeta = z.infer<typeof pageMetaSchema>;

export const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    meta: pageMetaSchema,
  });

export type Page<T> = {
  items: T[];
  meta: PageMeta;
};
