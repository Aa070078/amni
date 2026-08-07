import type { ApiEnvelope } from "@amni/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const CSRF_COOKIE = "amni_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  return match?.slice(CSRF_COOKIE.length + 1) || undefined;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, opts: { code: string; status: number; fieldErrors?: Record<string, string[]> }) {
    super(message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.fieldErrors = opts.fieldErrors;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  credentials?: RequestCredentials;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const csrfToken = !SAFE_METHODS.has(method) ? getCsrfToken() : undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(typeof window !== "undefined" ? { "X-Request-Id": crypto.randomUUID() } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: options.credentials ?? "include",
  });

  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !envelope || !envelope.ok) {
    if (envelope && !envelope.ok) {
      throw new ApiError(envelope.error.message, {
        code: envelope.error.code,
        status: res.status,
        fieldErrors: envelope.error.fieldErrors,
      });
    }
    throw new ApiError("Unexpected response from server", { code: "internal_error", status: res.status });
  }

  return envelope.data;
}
