import type {
  ApiEnvelope,
  CreateImportInput,
  ImportJob,
  ImportJobListResponse,
  ImportMapping,
  ImportSummaryResponse,
  ImportTemplatesResponse,
  ImportValidationResult,
} from "@amni/shared";

import { api, ApiError } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export const importsClient = {
  templates: (): Promise<ImportTemplatesResponse> => api<ImportTemplatesResponse>("/imports/templates"),
  templateCsvUrl: (kind: string): string => `${API_BASE}/imports/templates/${kind}`,
  list: (): Promise<ImportJobListResponse> => api<ImportJobListResponse>("/imports"),
  create: (input: CreateImportInput): Promise<ImportJob> =>
    api<ImportJob>("/imports", { method: "POST", body: input }),
  get: (id: string): Promise<ImportJob> => api<ImportJob>(`/imports/${id}`),
  saveMapping: (id: string, mapping: ImportMapping): Promise<ImportJob> =>
    api<ImportJob>(`/imports/${id}/mapping`, { method: "PUT", body: mapping }),
  validation: (id: string): Promise<ImportValidationResult> => api<ImportValidationResult>(`/imports/${id}/validation`),
  execute: (id: string): Promise<ImportJob> => api<ImportJob>(`/imports/${id}/execute`, { method: "POST" }),
  summary: (id: string): Promise<ImportSummaryResponse> => api<ImportSummaryResponse>(`/imports/${id}/summary`),
  rollback: (id: string): Promise<ImportJob> => api<ImportJob>(`/imports/${id}/rollback`, { method: "POST" }),
};

export async function uploadImportFile(id: string, file: File): Promise<ImportJob> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/imports/${id}/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<ImportJob> | null;

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
