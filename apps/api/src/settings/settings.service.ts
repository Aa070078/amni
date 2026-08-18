import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import type { Prisma } from "@amni/db";
import {
  ErrorCode,
  type BillingInput,
  type CompanySettings,
  type CurrentPlan,
  type Integration,
  type InviteMemberInput,
  type ProfileSettings,
  type SettingsRole,
  type TeamMember,
  type UpdateCompanySettingsInput,
  type UpdateMemberInput,
  type UpdateProfileInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysFromNow: number): string => new Date(Date.now() + daysFromNow * DAY_MS).toISOString();

const TEAM: TeamMember[] = [
  { id: "usr-1", email: "demo@amni.dev", firstName: "Amara", lastName: "Osei", role: "OWNER", status: "active", lastActive: iso(-1), joinedAt: iso(-120) },
  { id: "usr-2", email: "member@amni.dev", firstName: "Theo", lastName: "Lindqvist", role: "ADMIN", status: "active", lastActive: iso(-2), joinedAt: iso(-100) },
  { id: "usr-3", email: "mina@amni.dev", firstName: "Mina", lastName: "Delacroix", role: "SALES", status: "active", lastActive: iso(-3), joinedAt: iso(-80) },
  { id: "usr-4", email: "jonas@amni.dev", firstName: "Jonas", lastName: "Keller", role: "ACCOUNTANT", status: "invited", lastActive: null, joinedAt: iso(-30) },
];

const ROLES: SettingsRole[] = [
  { key: "OWNER", name: "Owner", description: "Full access to billing, settings and every module.", members: 1, permissions: ["*"] },
  { key: "ADMIN", name: "Admin", description: "Manage settings, team and most modules.", members: 1, permissions: ["settings.read", "settings.write", "sales.*", "purchasing.*", "finance.*", "inventory.*"] },
  { key: "ACCOUNTANT", name: "Accountant", description: "Finance and reporting access.", members: 1, permissions: ["finance.*", "reports.read"] },
  { key: "SALES", name: "Sales", description: "Customers, quotes and orders.", members: 1, permissions: ["sales.customers.*", "sales.orders.*"] },
  { key: "INVENTORY", name: "Inventory", description: "Products, stock and warehouses.", members: 0, permissions: ["inventory.*"] },
  { key: "MEMBER", name: "Member", description: "Base access to assigned areas.", members: 0, permissions: [] },
];

const PLAN: CurrentPlan = {
  plan: {
    code: "growth",
    name: "Growth",
    priceMonthly: 49,
    priceYearly: 470,
    seats: 10,
    storageGb: 100,
    features: ["Up to 10 team seats", "100 GB storage", "Sales, purchasing and inventory", "Finance & reporting", "Priority support"],
  },
  billingPeriod: "monthly",
  renewsAt: iso(28),
  seatsUsed: 4,
  status: "active",
  nextPayment: { date: iso(28), amount: 49, currency: "USD" },
  invoices: [
    { code: "PLN-0001", date: iso(-32), amount: 49, currency: "USD", status: "paid" },
    { code: "PLN-0002", date: iso(-62), amount: 49, currency: "USD", status: "paid" },
    { code: "PLN-0003", date: iso(-92), amount: 49, currency: "USD", status: "paid" },
  ],
};

const INTEGRATIONS: Integration[] = [
  { key: "stripe", name: "Stripe", description: "Collect card payments from invoices.", category: "payments", connected: true, status: "connected", account: "acct_1DemoCo" },
  { key: "plaid", name: "Plaid", description: "Connect bank accounts for reconciliation.", category: "banking", connected: false, status: "available" },
  { key: "shopify", name: "Shopify", description: "Sync products and orders from your store.", category: "commerce", connected: false, status: "available" },
  { key: "slack", name: "Slack", description: "Get notified about approvals and mentions.", category: "productivity", connected: false, status: "available" },
  { key: "google_drive", name: "Google Drive", description: "Attach and store supporting documents.", category: "productivity", connected: true, status: "connected", account: "demo@democo.example" },
  { key: "quickbooks", name: "QuickBooks", description: "Sync invoices and expenses to your accountant.", category: "data", connected: false, status: "error" },
];

/**
 * Reference data for the Demo Co tenant. Settings read from the platform
 * tenant record once M3 wires real provisioning; the contract stays the same.
 */
@Injectable()
export class SettingsService {
  private teamRecords: TeamMember[] = [...TEAM];
  private billingRecord: CurrentPlan = { ...PLAN, plan: { ...PLAN.plan }, nextPayment: PLAN.nextPayment ? { ...PLAN.nextPayment } : undefined, invoices: PLAN.invoices.map((invoice) => ({ ...invoice })) };

  async company(userId: string): Promise<CompanySettings> {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { company: { include: { tenant: true } } },
    });
    if (!membership) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "No company is linked to this account" });
    }
    const company = membership.company;
    const locale = (company.tenant?.locale ?? {}) as { currency?: string; timezone?: string };
    return {
      name: company.name,
      legalName: company.legalName ?? undefined,
      slug: company.slug,
      industry: company.industry ?? "Other",
      country: company.country ?? "US",
      taxId: company.taxId ?? undefined,
      address: company.address ?? undefined,
      email: company.email ?? undefined,
      phone: company.phone ?? undefined,
      website: company.website ?? undefined,
      currency: locale.currency ?? "USD",
      fiscalYearStart: company.fiscalYearStart ?? undefined,
      timezone: locale.timezone ?? "UTC",
      createdAt: company.createdAt.toISOString(),
    };
  }

  async updateCompany(userId: string, input: UpdateCompanySettingsInput): Promise<CompanySettings> {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { company: { include: { tenant: true } } },
    });
    if (!membership) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "No company is linked to this account" });
    }
    await prisma.company.update({
      where: { id: membership.companyId },
      data: {
        name: input.name,
        legalName: input.legalName,
        industry: input.industry,
        country: input.country,
        taxId: input.taxId,
        address: input.address,
        email: input.email,
        phone: input.phone,
        website: input.website,
        fiscalYearStart: input.fiscalYearStart,
      },
    });
    if (membership.company.tenant && (input.currency || input.timezone)) {
      const locale = (membership.company.tenant.locale ?? {}) as Record<string, unknown>;
      await prisma.tenant.update({
        where: { id: membership.company.tenant.id },
        data: {
          locale: {
            ...locale,
            ...(input.currency ? { currency: input.currency } : {}),
            ...(input.timezone ? { timezone: input.timezone } : {}),
          } as Prisma.InputJsonValue,
        },
      });
    }
    return this.company(userId);
  }

  team(): TeamMember[] {
    return this.teamRecords;
  }

  invite(input: InviteMemberInput): TeamMember {
    const existing = this.teamRecords.find((member) => member.email === input.email);
    if (existing) {
      throw new ApiException({
        code: ErrorCode.CONFLICT,
        status: 409,
        message: `A member with email ${input.email} already exists`,
      });
    }
    const member: TeamMember = {
      id: `usr-${this.teamRecords.length + 1}`,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      status: "invited",
      lastActive: null,
      joinedAt: new Date().toISOString(),
    };
    this.teamRecords.push(member);
    return member;
  }

  updateMember(id: string, input: UpdateMemberInput): TeamMember {
    const member = this.teamRecords.find((record) => record.id === id);
    if (!member) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Member ${id} not found` });
    }
    if (input.role !== undefined) member.role = input.role;
    if (input.status !== undefined) member.status = input.status;
    return member;
  }

  roles(): SettingsRole[] {
    return ROLES.map((role) => ({
      ...role,
      members: this.teamRecords.filter((member) => member.role === role.key).length,
    }));
  }

  plan(): CurrentPlan {
    return this.billingRecord;
  }

  changeBilling(input: BillingInput): CurrentPlan {
    this.billingRecord.billingPeriod = input.billingPeriod;
    this.billingRecord.nextPayment = {
      date: iso(28),
      amount: input.billingPeriod === "yearly" ? this.billingRecord.plan.priceYearly : this.billingRecord.plan.priceMonthly,
      currency: "USD",
    };
    return this.billingRecord;
  }

  integrations(): Integration[] {
    return INTEGRATIONS;
  }

  toggleIntegration(key: string): Integration {
    const integration = INTEGRATIONS.find((record) => record.key === key);
    if (!integration) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Integration ${key} not found` });
    }
    integration.connected = !integration.connected;
    integration.status = integration.connected ? "connected" : "available";
    return integration;
  }

  async profile(user: { id: string; email: string }): Promise<ProfileSettings> {
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true, locale: true },
    });
    if (!record) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "User profile not found" });
    }
    return {
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName ?? undefined,
      avatarUrl: record.avatarUrl,
      jobTitle: record.jobTitle ?? undefined,
      locale: record.locale as ProfileSettings["locale"],
    };
  }

  async updateProfile(user: { id: string; email: string }, input: UpdateProfileInput): Promise<ProfileSettings> {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl,
        jobTitle: input.jobTitle,
        locale: input.locale as Prisma.InputJsonValue | undefined,
      },
    });
    return this.profile(user);
  }
}
