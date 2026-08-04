import type { ErrorCode } from "@amni/shared";

/**
 * Errors thrown by the ERP client. `code` maps to the shared API contract so
 * the gateway can translate without leaking internal details.
 */
export class ErpError extends Error {
  readonly code: ErrorCode;
  readonly status: number | null;
  readonly frappeType?: string;
  readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    opts: { status?: number; frappeType?: string; requestId?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = "ErpError";
    this.code = code;
    this.status = opts.status ?? null;
    this.frappeType = opts.frappeType;
    this.requestId = opts.requestId;
  }
}
