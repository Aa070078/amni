import { z } from "zod";
import { onboardingWizardSchema } from "./company.js";

export const wizardStepSchema = z.enum(["company", "regional", "business", "team", "import", "review"]);

export const WIZARD_STEPS: { value: WizardStep; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "regional", label: "Regional settings" },
  { value: "business", label: "Business setup" },
  { value: "team", label: "Your team" },
  { value: "import", label: "Import data" },
  { value: "review", label: "Review" },
];

export const wizardImportSourceSchema = z.enum(["none", "csv", "erp", "sample"]);

export const wizardImportSchema = z.object({
  source: wizardImportSourceSchema.default("none"),
  file: z.string().max(500).optional(),
  mapping: z.string().max(240).optional(),
});

export const wizardDraftSchema = onboardingWizardSchema.extend({
  import: wizardImportSchema.default({ source: "none" }),
  currentStep: wizardStepSchema.default("company"),
  completedSteps: z.array(wizardStepSchema).default([]),
  updatedAt: z.string().datetime(),
});

export const wizardSaveInputSchema = wizardDraftSchema.partial();

export const wizardSubmitInputSchema = z.object({
  planCode: z.string().min(1).max(40).optional(),
});

export const wizardStatusSchema = z.object({
  status: z.enum(["pending", "provisioning", "failed", "ready"]),
  message: z.string().max(240).optional(),
});

export type WizardStep = z.infer<typeof wizardStepSchema>;
export type WizardImportSource = z.infer<typeof wizardImportSourceSchema>;
export type WizardImport = z.infer<typeof wizardImportSchema>;
export type WizardDraft = z.infer<typeof wizardDraftSchema>;
export type WizardSaveInput = z.infer<typeof wizardSaveInputSchema>;
export type WizardSubmitInput = z.infer<typeof wizardSubmitInputSchema>;
export type WizardStatus = z.infer<typeof wizardStatusSchema>;
