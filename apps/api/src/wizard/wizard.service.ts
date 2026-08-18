import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import type { Prisma } from "@amni/db";
import {
  ErrorCode,
  wizardDraftSchema,
  type WizardDraft,
  type WizardSaveInput,
  type WizardStatus,
  type WizardSubmitInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PlansService } from "../plans/plans.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProvisioningService } from "../provisioning/provisioning.service";

const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const DEFAULT_DRAFT: WizardDraft = {
  company: {
    name: "Your company",
    industry: "Other",
    country: "GB",
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
  team: [],
  import: { source: "none" },
  currentStep: "company",
  completedSteps: [],
  updatedAt: iso(0),
};

const PLAN_TIER_TO_DB: Record<string, "TRIAL" | "STARTER" | "GROWTH" | "SCALE"> = {
  trial: "TRIAL",
  starter: "STARTER",
  growth: "GROWTH",
  scale: "SCALE",
};

/**
 * Onboarding is persisted per user so two signups can never share a draft or
 * attach themselves to another company's tenant. Submission always updates
 * the company created during registration, then enqueues that exact tenant.
 */
@Injectable()
export class WizardService {
  constructor(
    private readonly plans: PlansService,
    private readonly provisioning: ProvisioningService,
  ) {}

  async draft(userId: string): Promise<WizardDraft> {
    const record = await prisma.onboardingDraft.findUnique({ where: { userId }, select: { data: true } });
    const parsed = record ? wizardDraftSchema.safeParse(record.data) : undefined;
    if (parsed?.success) return parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        memberships: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { company: { select: { name: true, country: true } } },
        },
      },
    });
    if (!user?.memberships[0]) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "No company is linked to this account" });
    }

    const company = user.memberships[0].company;
    const draft = wizardDraftSchema.parse({
      ...DEFAULT_DRAFT,
      company: {
        ...DEFAULT_DRAFT.company,
        name: company.name,
        legalName: company.name,
        country: company.country ?? DEFAULT_DRAFT.company.country,
      },
      regional: {
        ...DEFAULT_DRAFT.regional,
        country: company.country ?? DEFAULT_DRAFT.regional.country,
      },
      team: [{
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName ?? undefined,
        role: "admin",
      }],
      updatedAt: new Date().toISOString(),
    });

    await prisma.onboardingDraft.upsert({
      where: { userId },
      update: { data: draft as unknown as Prisma.InputJsonValue },
      create: { userId, data: draft as unknown as Prisma.InputJsonValue },
    });
    return draft;
  }

  async save(userId: string, input: WizardSaveInput): Promise<WizardDraft> {
    const previous = await this.draft(userId);
    const next = wizardDraftSchema.parse({
      ...previous,
      ...input,
      company: { ...previous.company, ...(input.company ?? {}) },
      regional: { ...previous.regional, ...(input.regional ?? {}) },
      business: { ...previous.business, ...(input.business ?? {}) },
      import: { ...previous.import, ...(input.import ?? {}) },
      team: input.team ?? previous.team,
      completedSteps: input.completedSteps ?? previous.completedSteps,
      updatedAt: new Date().toISOString(),
    });
    await prisma.onboardingDraft.upsert({
      where: { userId },
      update: { data: next as unknown as Prisma.InputJsonValue },
      create: { userId, data: next as unknown as Prisma.InputJsonValue },
    });
    return next;
  }

  async submit(user: { id: string; email: string }, input?: WizardSubmitInput): Promise<WizardStatus> {
    const draft = await this.draft(user.id);

    const plan = await this.plans.findByCode(input?.planCode ?? "trial");
    if (!plan) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: `Unknown plan ${input?.planCode ?? "trial"}`,
      });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { company: { include: { tenant: true } } },
    });
    if (!membership) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "No company is linked to this account" });
    }

    const company = await prisma.company.update({
      where: { id: membership.companyId },
      data: {
        name: draft.company.name,
        legalName: draft.company.legalName,
        industry: draft.company.industry,
        country: draft.company.country,
        taxId: draft.company.taxId,
        address: draft.company.address,
        status: "ONBOARDING",
      },
    });

    const siteName = membership.company.slug;

    const tenant = await prisma.tenant.upsert({
      where: { companyId: company.id },
      update: { locale: draft.regional, planTier: planTierFor(plan.tier) },
      create: {
        companyId: company.id,
        siteName,
        siteUrl: siteUrlFor(siteName),
        status: "CREATING",
        planTier: planTierFor(plan.tier),
        locale: draft.regional,
      },
    });

    if (tenant.status === "ACTIVE") {
      return { status: "ready", message: `${draft.company.name} is already provisioned.` };
    }

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

    await prisma.onboardingDraft.update({ where: { userId: user.id }, data: { submittedAt: new Date() } });
    return {
      status: "provisioning",
      message: `${draft.company.name} is being provisioned. We'll take you to your dashboard once the workspace is ready.`,
    };
  }

  async status(userId: string): Promise<WizardStatus> {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { company: { include: { tenant: true } } },
    });
    const tenant = membership?.company?.tenant;

    if (tenant?.status === "ACTIVE") return { status: "ready" };
    if (tenant?.status === "FAILED") {
      return { status: "failed", message: "Provisioning stopped before the workspace was ready." };
    }
    if (tenant) {
      return { status: "provisioning", message: "Provisioning your workspace…" };
    }
    return { status: "pending", message: "Complete the company profile to provision your workspace." };
  }
}

function siteUrlFor(siteName: string): string {
  const domain = process.env.PLATFORM_DOMAIN ?? (process.env.NODE_ENV === "production" ? "amni.app" : "localhost");
  const scheme = process.env.NODE_ENV === "production" ? "https" : "http";
  const port = process.env.NODE_ENV === "production" ? "" : `:${process.env.ERPNEXT_HTTP_PORT ?? "8080"}`;
  return `${scheme}://${siteName}.${domain}${port}`;
}

function planTierFor(tier: string): "TRIAL" | "STARTER" | "GROWTH" | "SCALE" {
  const value = PLAN_TIER_TO_DB[tier.toLowerCase()];
  if (!value) {
    throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: `Unsupported plan tier ${tier}` });
  }
  return value;
}
