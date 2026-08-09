import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import {
  type WizardDraft,
  type WizardSaveInput,
  type WizardStatus,
} from "@amni/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SettingsService } from "../settings/settings.service";

const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const DEFAULT_DRAFT: WizardDraft = {
  company: {
    name: "Demo Co.",
    legalName: "Demo Co. Ltd",
    industry: "Furniture & interiors",
    country: "GB",
    taxId: "GB123456789",
    address: "14 Harbourside Way, Bristol BS1 4UP, United Kingdom",
  },
  regional: {
    currency: "GBP",
    timezone: "Europe/London",
    dateFormat: "DD-MM-YYYY",
    numberFormat: "1,000.00",
    country: "GB",
    language: "en",
  },
  business: {
    defaultTermOfPayment: "Net 30",
    enableInventory: true,
    enablePayroll: false,
    additionalCompanyFields: {},
  },
  team: [
    { email: "demo@amni.dev", firstName: "Amara", lastName: "Osei", role: "admin" },
  ],
  import: { source: "sample", mapping: "Standard chart of accounts" },
  currentStep: "company",
  completedSteps: [],
  updatedAt: iso(0),
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 63);

/**
 * Onboarding wizard. Holds the draft in memory for the Demo Co tenant; on
 * submit it provisions a real company profile in the platform database and
 * adapts every settings surface to it. M3 replaces the in-memory draft with
 * the persisted onboarding state and kicks off the provisioning job.
 */
@Injectable()
export class WizardService {
  private draftRecord: WizardDraft = JSON.parse(JSON.stringify(DEFAULT_DRAFT));
  private submitted = false;

  constructor(private readonly settings: SettingsService) {}

  draft(): WizardDraft {
    return this.draftRecord;
  }

  save(input: WizardSaveInput): WizardDraft {
    const previous = this.draftRecord;
    this.draftRecord = {
      ...previous,
      ...input,
      company: { ...previous.company, ...(input.company ?? {}) },
      regional: { ...previous.regional, ...(input.regional ?? {}) },
      business: { ...previous.business, ...(input.business ?? {}) },
      import: { ...previous.import, ...(input.import ?? {}) },
      team: input.team ?? previous.team,
      completedSteps: input.completedSteps ?? previous.completedSteps,
      updatedAt: new Date().toISOString(),
    };
    return this.draftRecord;
  }

  async submit(user: { id: string; email: string }): Promise<WizardStatus> {
    const draft = this.draftRecord;
    const slug = slugify(draft.company.name) || "company";

    const company = await prisma.company.upsert({
      where: { slug },
      update: {
        name: draft.company.name,
        legalName: draft.company.legalName,
        industry: draft.company.industry,
        country: draft.company.country,
        taxId: draft.company.taxId,
        address: draft.company.address,
        status: "READY",
      },
      create: {
        name: draft.company.name,
        legalName: draft.company.legalName,
        slug,
        industry: draft.company.industry,
        country: draft.company.country,
        taxId: draft.company.taxId,
        address: draft.company.address,
        status: "READY",
      },
    });

    const siteName = draft.company.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 63) || slug;
    await prisma.tenant.upsert({
      where: { companyId: company.id },
      update: { locale: draft.regional },
      create: {
        companyId: company.id,
        siteName,
        siteUrl: `https://${siteName}.amni.dev`,
        status: "ACTIVE",
        planTier: "TRIAL",
        locale: draft.regional,
      },
    });

    await prisma.membership.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: { platformRole: "OWNER" },
      create: { companyId: company.id, userId: user.id, platformRole: "OWNER" },
    });

    this.settings.updateCompany({
      name: draft.company.name,
      legalName: draft.company.legalName,
      industry: draft.company.industry,
      country: draft.company.country,
      taxId: draft.company.taxId,
      address: draft.company.address,
      currency: draft.regional.currency,
      timezone: draft.regional.timezone,
    });

    this.submitted = true;
    return { status: "ready", message: `${draft.company.name} is ready. We provisioned your workspace from the details above.` };
  }

  status(): WizardStatus {
    if (this.submitted) return { status: "ready" };
    return { status: "pending", message: "Complete the company profile to provision your workspace." };
  }
}
