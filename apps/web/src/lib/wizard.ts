import type { GlobalSearchResponse, WizardDraft, WizardSaveInput, WizardStatus } from "@amni/shared";

import { apiRequest } from "./client";

export const searchClient = {
  global(q: string): Promise<GlobalSearchResponse> {
    return apiRequest<GlobalSearchResponse>("/search", `?q=${encodeURIComponent(q)}`);
  },
};

export const wizardClient = {
  draft(): Promise<WizardDraft> {
    return apiRequest<WizardDraft>("/wizard", "");
  },
  save(input: WizardSaveInput): Promise<WizardDraft> {
    return apiRequest<WizardDraft>("/wizard", "", { method: "PUT", body: input });
  },
  submit(): Promise<WizardStatus> {
    return apiRequest<WizardStatus>("/wizard", "/submit", { method: "POST" });
  },
  status(): Promise<WizardStatus> {
    return apiRequest<WizardStatus>("/wizard", "/status");
  },
};
