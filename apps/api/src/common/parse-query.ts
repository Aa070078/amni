import { ErrorCode } from "@amni/shared";
import type { z, ZodType } from "zod";

import { ApiException } from "./api.exception";

export function parseQuery<S extends ZodType>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiException({
      code: ErrorCode.VALIDATION,
      status: 400,
      message: "Invalid query parameters",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  return parsed.data;
}
