import { api } from "./api";
import type { HrmsSsoUrlResponse, HrmsStatus } from "@amni/shared";

export const hrmsStatus = (): Promise<HrmsStatus> => api<HrmsStatus>("/hrms/status");

export const hrmsSsoUrl = (returnPath = "/app/hrms"): Promise<HrmsSsoUrlResponse> => {
  const query = new URLSearchParams({ return: returnPath });
  return api<HrmsSsoUrlResponse>(`/hrms/sso-url?${query.toString()}`);
};
