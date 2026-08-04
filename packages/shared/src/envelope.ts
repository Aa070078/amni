import { z } from "zod";
import { ErrorCode } from "./errors.js";

export const errorCodeSchema = z.nativeEnum(ErrorCode);

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  requestId: z.string().optional(),
});

export const apiEnvelopeSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    data: z.unknown(),
    requestId: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    error: apiErrorSchema,
  }),
]);

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiEnvelope<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: ApiError };

export function success<T>(data: T, requestId: string): ApiEnvelope<T> {
  return { ok: true, data, requestId };
}

export function failure(error: ApiError): ApiEnvelope<never> {
  return { ok: false, error };
}
