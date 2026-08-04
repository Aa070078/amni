import { ErrorCode } from "@amni/shared";
import { ErpError } from "./errors.js";

interface FrappeErrorBody {
  exception?: string;
  exc_type?: string;
  _server_messages?: Array<string | { message?: string }>;
  message?: string;
}

/**
 * Maps a non-2xx Frappe REST response to a typed ErpError, translating known
 * Frappe exception types into shared API error codes.
 */
export function mapErrorResponse(
  status: number,
  body: unknown,
  requestId?: string,
): ErpError {
  const b = (typeof body === "object" && body !== null ? body : {}) as FrappeErrorBody;
  const message = extractMessage(b);
  const frappeType = b.exc_type;

  let code: ErrorCode = ErrorCode.ERP_VALIDATION;
  if (status === 401 || status === 403) code = ErrorCode.ERP_UNAUTHORIZED;
  else if (status === 404) code = ErrorCode.ERP_NOT_FOUND;
  else if (status === 429) code = ErrorCode.ERP_RATE_LIMITED;
  else if (status >= 500) code = ErrorCode.ERP_UNREACHABLE;
  else if (frappeType === "DoesNotExistError" || frappeType === "NotFoundError") {
    code = ErrorCode.ERP_NOT_FOUND;
  } else if (frappeType === "DuplicateEntryError") {
    code = ErrorCode.ERP_CONFLICT;
  } else if (frappeType === "AuthenticationError" || frappeType === "PermissionError") {
    code = ErrorCode.ERP_UNAUTHORIZED;
  } else if (frappeType === "ValidationError" || frappeType === "MandatoryError") {
    code = ErrorCode.ERP_VALIDATION;
  }

  return new ErpError(code, message, { status, frappeType, requestId });
}

function extractMessage(b: FrappeErrorBody): string {
  const raw = b._server_messages?.[0];
  if (typeof raw === "string") return raw;
  if (raw && typeof raw.message === "string") return raw.message;
  if (typeof b.message === "string") return b.message;
  if (typeof b.exception === "string") return b.exception.split("\n")[0] ?? "ERPNext request failed";
  return "ERPNext request failed";
}
