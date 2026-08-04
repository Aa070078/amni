import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { type ApiError, ErrorCode, failure } from "@amni/shared";
import { ErpError } from "@amni/erp";

const DEFAULT_ERROR: ApiError = {
  code: ErrorCode.INTERNAL,
  message: "Something went wrong",
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = res.locals.requestId as string | undefined;

    const mapped = this.map(exception);
    if (mapped.status >= 500) {
      this.logger.error(
        { err: exception, requestId, path: req.path },
        mapped.error.message,
      );
    }

    res.status(mapped.status).json(failure({ ...mapped.error, requestId }));
  }

  private map(exception: unknown): { status: number; error: ApiError } {
    if (exception instanceof ErpError) {
      return {
        status: erpHttpStatus(exception.code),
        error: { code: exception.code, message: exception.message },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const bodyMessage =
        typeof body === "string" ? body : (body as { message?: string | string[] }).message;
      const raw = bodyMessage ?? exception.message;
      const normalized = Array.isArray(raw) ? raw.join("; ") : raw || "Request failed";

      return {
        status,
        error: {
          code: httpCodeToErrorCode(status),
          message: normalized,
        },
      };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, error: DEFAULT_ERROR };
  }
}

function httpCodeToErrorCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT;
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorCode.VALIDATION;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION;
    default:
      return ErrorCode.INTERNAL;
  }
}

function erpHttpStatus(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.ERP_UNAUTHORIZED:
      return HttpStatus.UNAUTHORIZED;
    case ErrorCode.ERP_NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case ErrorCode.ERP_CONFLICT:
      return HttpStatus.CONFLICT;
    case ErrorCode.ERP_VALIDATION:
      return HttpStatus.UNPROCESSABLE_ENTITY;
    case ErrorCode.ERP_RATE_LIMITED:
      return HttpStatus.TOO_MANY_REQUESTS;
    case ErrorCode.ERP_TIMEOUT:
      return HttpStatus.GATEWAY_TIMEOUT;
    case ErrorCode.ERP_UNREACHABLE:
    case ErrorCode.ERP_SSRF_BLOCKED:
      return HttpStatus.BAD_GATEWAY;
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
