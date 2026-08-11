/**
 * API error codes. Never change an existing code's meaning — add new codes instead.
 * Envelope consumers must be able to rely on a stable contract.
 */
export const ErrorCode = {
  // Generic
  INTERNAL: "internal_error",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  UNPROCESSABLE: "unprocessable_entity",
  VALIDATION: "validation_error",
  FORBIDDEN: "forbidden",
  UNAUTHORIZED: "unauthorized",
  RATE_LIMITED: "rate_limited",
  REQUEST_TIMEOUT: "request_timeout",

  // Auth / sessions
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  ACCOUNT_LOCKED: "account_locked",
  SESSION_EXPIRED: "session_expired",
  SESSION_REVOKED: "session_revoked",
  INVALID_REFRESH: "invalid_refresh",
  RESET_TOKEN_INVALID: "reset_token_invalid",
  VERIFY_TOKEN_INVALID: "verify_token_invalid",
  EMAIL_ALREADY_REGISTERED: "email_already_registered",

  // Tenant / provisioning
  TENANT_NOT_READY: "tenant_not_ready",
  TENANT_SUSPENDED: "tenant_suspended",
  TENANT_ARCHIVED: "tenant_archived",
  PROVISIONING_IN_PROGRESS: "provisioning_in_progress",
  SITE_NAME_UNAVAILABLE: "site_name_unavailable",
  PROVISIONING_JOB_STALE: "provisioning_job_stale",
  HRMS_NOT_INSTALLED: "hrms_not_installed",

  // ERP integration
  ERP_UNREACHABLE: "erp_unreachable",
  ERP_UNAUTHORIZED: "erp_unauthorized",
  ERP_NOT_FOUND: "erp_not_found",
  ERP_VALIDATION: "erp_validation",
  ERP_CONFLICT: "erp_conflict",
  ERP_RATE_LIMITED: "erp_rate_limited",
  ERP_TIMEOUT: "erp_timeout",
  ERP_SSRF_BLOCKED: "erp_ssrf_blocked",

  // Import
  IMPORT_TEMPLATE_INVALID: "import_template_invalid",
  IMPORT_MAPPING_INVALID: "import_mapping_invalid",
  IMPORT_VALIDATION_FAILED: "import_validation_failed",
  IMPORT_IN_PROGRESS: "import_in_progress",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
