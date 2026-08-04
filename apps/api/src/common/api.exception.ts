import { HttpException, HttpStatus } from "@nestjs/common";
import type { ErrorCode } from "@amni/shared";

interface ApiExceptionOptions {
  code: ErrorCode;
  status?: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
  retryAfterMs?: number;
}

/**
 * Exception that maps directly to the shared API error contract.
 * The AllExceptionsFilter reads `code` so envelope consumers get a
 * stable, typed error code instead of a generic HTTP-status mapping.
 */
export class ApiException extends HttpException {
  readonly code: ErrorCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfterMs?: number;

  constructor(options: ApiExceptionOptions) {
    super(options.message, options.status ?? HttpStatus.BAD_REQUEST);
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
    this.retryAfterMs = options.retryAfterMs;
  }
}
