import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import {
  ErrorCode,
  type WizardDraft,
  type WizardSaveInput,
  type WizardStatus,
  type WizardSubmitInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
// Value imports required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SettingsService } from "../settings/settings.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PlansService } from "../plans/plans.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProvisioningService } from "../provisioning/provisioning.service";

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

const PLAN_TIER_TO_DB: Record<string, "TRIAL" | "STARTER" | "GROWTH" | "SCALE"> = {
  trial: "TRIAL",
  starter: "STARTER",
  growth: "GROWTH",
  scale: "SCALE",
};

/**
 * Onboarding wizard. Holds the draft in memory for the demo tenant; on submit
 * it provisions a company profile, plan + subscription and enqueues the
 * provisioning job (M3). The status flips to "provisioning" until the worker
 * marks the tenant ACTIVE.
 */
@Injectable()
export class WizardService {
  private draftRecord: WizardDraft = JSON.parse(JSON.stringify(DEFAULT_DRAFT));
  private submitted = false;

  constructor(
    private readonly settings: SettingsService,
    private readonly plans: PlansService,
    private readonly provisioning: ProvisioningService,
  ) {}

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

  async submit(user: { id: string; email: string }, input?: WizardSubmitInput): Promise<WizardStatus> {
    const draft = this.draftRecord;

    const plan = await this.plans.findByCode(input?.planCode ?? "trial");
    if (!plan) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: `Unknown plan ${input?.planCode ?? "trial"}`,
      });
    }

    const slug = slugify(draft.company.name) || "company";
    const siteName = slugify(draft.company.name) || slug;

    const company = await prisma.company.upsert({
      where: { slug },
      update: {
        name: draft.company.name,
        legalName: draft.company.legalName,
        industry: draft.company.industry,
        country: draft.company.country,
        taxId: draft.company.taxId,
        address: draft.company.address,
        status: "ONBOARDING",
      },
      create: {
        name: draft.company.name,
        legalName: draft.company.legalName,
        slug,
        industry: draft.company.industry,
        country: draft.company.country,
        taxId: draft.company.taxId,
        address: draft.company.address,
        status: "ONBOARDING",
      },
    });

    const tenant = await prisma.tenant.upsert({
      where: { companyId: company.id },
      update: { locale: draft.regional, planTier: PLAN_TIER_TO_DB[plan.tier] },
      create: {
        companyId: company.id,
        siteName,
        siteUrl: `https://${siteName}.amni.dev`,
        status: "CREATING",
        planTier: PLAN_TIER_TO_DB[plan.tier],
        locale: draft.regional,
      },
    });

    if (tenant.status === "ACTIVE") {
      return { status: "ready", message: `${draft.company.name} is already provisioned.` };
    }

    await prisma.membership.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: { platformRole: "OWNER" },
      create: { companyId: company.id, userId: user.id, platformRole: "OWNER" },
    });

    const existingSubscription = await prisma.subscription.findFirst({
      where: { companyId: company.id },
    });
    const trialEndsAt = new Date(Date.now() + 14 * 86_400_000);
    if (existingSubscription) {
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: { planId: plan.id, status: "TRIAL", startsAt: new Date(), trialEndsAt },
      });
    } else {
      await prisma.subscription.create({
        data: {
          companyId: company.id,
          planId: plan.id,
          status: "TRIAL",
          startsAt: new Date(),
          trialEndsAt,
        },
      });
    }

    await this.provisioning.enqueue({
      tenantId: tenant.id,
      companyId: company.id,
      createdBy: user.id,
      siteName,
      siteUrl: tenant.siteUrl,
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
    return {
      status: "provisioning",
      message: `${draft.company.name} is being provisioned. We'll take you to your dashboard once the workspace is ready.`,
    };
  }

  async status(): Promise<WizardStatus> {
    const membership = await prisma.membership.findFirst({
      include: { company: { include: { tenant: true } } },
    });
    const tenant = membership?.company?.tenant;

    if (tenant?.status === "ACTIVE") return { status: "ready" };
    if (this.submitted || tenant) {
      return { status: "provisioning", message: "Provisioning your workspace…" };
    }
    return { status: "pending", message: "Complete the company profile to provision your workspace." };
  }
}
