import { createHash, randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import type { Prisma } from "@amni/db";
import {
  ErrorCode,
  MailTemplate,
  type BillingInput,
  type CompanySettings,
  type CurrentPlan,
  type Integration,
  type InviteMemberInput,
  type ProfileSettings,
  type SettingsRole,
  type TeamMember,
  type TeamRole,
  type UpdateCompanySettingsInput,
  type UpdateMemberInput,
  type UpdateProfileInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits Nest dependency metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MailService } from "../jobs/mail.service";

const ROLE_DEFINITIONS: Array<Omit<SettingsRole, "members">> = [
  { key: "OWNER", name: "Owner", description: "Full access to billing, settings, and every module.", permissions: ["*"] },
  { key: "ADMIN", name: "Admin", description: "Manage settings, team, and every business module.", permissions: ["settings.*", "sales.*", "purchasing.*", "finance.*", "inventory.*"] },
  { key: "ACCOUNTANT", name: "Accountant", description: "Finance, expenses, accounting, and reporting.", permissions: ["finance.*", "reports.read"] },
  { key: "SALES", name: "Sales", description: "CRM, customers, quotations, orders, and invoices.", permissions: ["sales.*", "crm.*", "people.read"] },
  { key: "INVENTORY", name: "Inventory", description: "Products, stock, warehouses, and purchasing.", permissions: ["inventory.*", "purchasing.*"] },
  { key: "MEMBER", name: "Member", description: "Dashboard, notifications, HRMS, and own profile.", permissions: ["dashboard.read", "notifications.*", "hrms.*", "profile.*"] },
];

const INTEGRATION_CATALOG: Integration[] = [
  { key: "stripe", name: "Stripe", description: "Card payment collection is not configured for this deployment.", category: "payments", connected: false, status: "available" },
  { key: "plaid", name: "Plaid", description: "Bank feeds are not configured for this deployment.", category: "banking", connected: false, status: "available" },
  { key: "shopify", name: "Shopify", description: "Commerce synchronization is not configured for this deployment.", category: "commerce", connected: false, status: "available" },
  { key: "slack", name: "Slack", description: "Workspace notifications are not configured for this deployment.", category: "productivity", connected: false, status: "available" },
  { key: "google_drive", name: "Google Drive", description: "External document storage is not configured for this deployment.", category: "productivity", connected: false, status: "available" },
  { key: "quickbooks", name: "QuickBooks", description: "External accounting synchronization is not configured for this deployment.", category: "data", connected: false, status: "available" },
];

@Injectable()
export class SettingsService {
  constructor(private readonly mail: MailService) {}

  async company(userId: string): Promise<CompanySettings> {
    const membership = await this.membership(userId, { company: { include: { tenant: true } } });
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

  async updateCompany(actor: GatewayUser, meta: GatewayRequestMeta, input: UpdateCompanySettingsInput): Promise<CompanySettings> {
    const membership = await this.membership(actor.id, { company: { include: { tenant: true } } });
    await prisma.company.update({
      where: { id: membership.companyId },
      data: { name: input.name, legalName: input.legalName, industry: input.industry, country: input.country, taxId: input.taxId, address: input.address, email: input.email, phone: input.phone, website: input.website, fiscalYearStart: input.fiscalYearStart },
    });
    if (membership.company.tenant && (input.currency || input.timezone)) {
      const locale = (membership.company.tenant.locale ?? {}) as Record<string, unknown>;
      await prisma.tenant.update({ where: { id: membership.company.tenant.id }, data: { locale: { ...locale, ...(input.currency ? { currency: input.currency } : {}), ...(input.timezone ? { timezone: input.timezone } : {}) } as Prisma.InputJsonValue } });
    }
    await this.audit(actor, meta, membership.companyId, "settings.company.update", "Company", membership.companyId);
    return this.company(actor.id);
  }

  async team(userId: string): Promise<TeamMember[]> {
    const { companyId } = await this.membership(userId);
    const [memberships, invitations] = await Promise.all([
      prisma.membership.findMany({ where: { companyId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
      prisma.invitation.findMany({ where: { companyId, status: { in: ["PENDING", "DISABLED"] } }, orderBy: { createdAt: "asc" } }),
    ]);
    return [
      ...memberships.map((item) => ({ id: item.id, email: item.user.email, firstName: item.user.firstName, lastName: item.user.lastName ?? undefined, role: toTeamRole(item.platformRole, item.productRole), status: item.status === "DISABLED" ? "disabled" as const : "active" as const, lastActive: item.user.lastLoginAt?.toISOString() ?? null, joinedAt: item.createdAt.toISOString() })),
      ...invitations.map((item) => ({ id: item.id, email: item.email, firstName: item.firstName, lastName: item.lastName ?? undefined, role: toTeamRole(item.platformRole, item.productRole), status: item.status === "DISABLED" ? "disabled" as const : "invited" as const, lastActive: null, joinedAt: item.createdAt.toISOString() })),
    ];
  }

  async invite(actor: GatewayUser, meta: GatewayRequestMeta, input: InviteMemberInput): Promise<TeamMember> {
    if (input.role === "OWNER") throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Ownership transfer requires a dedicated verified transfer flow" });
    const { companyId, company } = await this.membership(actor.id, { company: true });
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { memberships: { where: { companyId }, select: { id: true } } } });
    const pending = await prisma.invitation.findFirst({ where: { companyId, email: input.email, status: "PENDING" }, select: { id: true } });
    if (existing?.memberships.length || pending) throw new ApiException({ code: ErrorCode.CONFLICT, status: 409, message: `A member or pending invitation for ${input.email} already exists` });
    const token = randomBytes(32).toString("base64url");
    const role = fromTeamRole(input.role);
    const invitation = await prisma.invitation.create({
      data: { companyId, email: input.email, firstName: input.firstName, lastName: input.lastName, platformRole: role.platformRole, productRole: role.productRole, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 7 * 86_400_000), invitedById: actor.id },
    });
    try {
      await this.mail.enqueue({ template: MailTemplate.INVITATION, to: invitation.email, firstName: invitation.firstName, companyName: company.name, role: input.role, token });
    } catch {
      await prisma.invitation.delete({ where: { id: invitation.id } });
      throw new ApiException({ code: ErrorCode.INTERNAL, status: 503, message: "The invitation could not be delivered; try again" });
    }
    await this.audit(actor, meta, companyId, "settings.team.invite", "Invitation", invitation.id, { role: input.role });
    return { id: invitation.id, email: invitation.email, firstName: invitation.firstName, lastName: invitation.lastName ?? undefined, role: input.role, status: "invited", lastActive: null, joinedAt: invitation.createdAt.toISOString() };
  }

  async updateMember(actor: GatewayUser, meta: GatewayRequestMeta, id: string, input: UpdateMemberInput): Promise<TeamMember> {
    if (input.role === "OWNER") throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Ownership transfer requires a dedicated verified transfer flow" });
    const { companyId } = await this.membership(actor.id);
    const member = await prisma.membership.findFirst({ where: { id, companyId }, include: { user: true } });
    if (member) {
      if (member.platformRole === "OWNER") throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "The workspace owner cannot be changed from this screen" });
      const role = input.role ? fromTeamRole(input.role) : undefined;
      const updated = await prisma.membership.update({ where: { id }, data: { platformRole: role?.platformRole, productRole: role?.productRole, status: input.status ? (input.status === "disabled" ? "DISABLED" : "ACTIVE") : undefined }, include: { user: true } });
      await this.audit(actor, meta, companyId, "settings.team.update", "Membership", id, input);
      return { id: updated.id, email: updated.user.email, firstName: updated.user.firstName, lastName: updated.user.lastName ?? undefined, role: toTeamRole(updated.platformRole, updated.productRole), status: updated.status === "DISABLED" ? "disabled" : "active", lastActive: updated.user.lastLoginAt?.toISOString() ?? null, joinedAt: updated.createdAt.toISOString() };
    }
    const invitation = await prisma.invitation.findFirst({ where: { id, companyId } });
    if (!invitation) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Team member ${id} not found` });
    const role = input.role ? fromTeamRole(input.role) : undefined;
    const updated = await prisma.invitation.update({ where: { id }, data: { platformRole: role?.platformRole, productRole: role?.productRole, status: input.status === "disabled" ? "DISABLED" : input.status === "invited" ? "PENDING" : undefined } });
    await this.audit(actor, meta, companyId, "settings.invitation.update", "Invitation", id, input);
    return { id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName ?? undefined, role: toTeamRole(updated.platformRole, updated.productRole), status: updated.status === "DISABLED" ? "disabled" : "invited", lastActive: null, joinedAt: updated.createdAt.toISOString() };
  }

  async roles(userId: string): Promise<SettingsRole[]> {
    const team = await this.team(userId);
    return ROLE_DEFINITIONS.map((role) => ({ ...role, members: team.filter((member) => member.role === role.key && member.status !== "disabled").length }));
  }

  async plan(userId: string): Promise<CurrentPlan> {
    const membership = await this.membership(userId, { company: { include: { memberships: true, tenant: true, subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } } } });
    const subscription = membership.company.subscriptions[0];
    if (!subscription) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "No subscription is configured for this workspace" });
    const limits = subscription.plan.limits as { users?: number; storageGb?: number };
    const features = subscription.plan.features as Record<string, unknown>;
    const monthly = subscription.plan.price.toNumber();
    const renewsAt = subscription.trialEndsAt ?? subscription.endsAt ?? addPeriod(subscription.startsAt, subscription.billingPeriod);
    const status = subscription.status === "EXPIRED" ? "cancelled" : subscription.status.toLowerCase() as CurrentPlan["status"];
    return {
      plan: { code: subscription.plan.code, name: subscription.plan.name, priceMonthly: monthly, priceYearly: monthly * 10, seats: limits.users ?? 1, storageGb: limits.storageGb ?? 1, features: Object.entries(features).filter(([, enabled]) => Boolean(enabled)).map(([key]) => featureLabel(key)) },
      billingPeriod: subscription.billingPeriod.toLowerCase() as CurrentPlan["billingPeriod"],
      renewsAt: renewsAt.toISOString(),
      seatsUsed: membership.company.memberships.filter((item) => item.status === "ACTIVE").length,
      status,
      nextPayment: undefined,
      invoices: [],
    };
  }

  async changeBilling(actor: GatewayUser, meta: GatewayRequestMeta, input: BillingInput): Promise<CurrentPlan> {
    void actor; void meta; void input;
    throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Billing changes require a configured payment provider" });
  }

  integrations(): Integration[] {
    return INTEGRATION_CATALOG.map((item) => ({ ...item }));
  }

  toggleIntegration(key: string): never {
    if (!INTEGRATION_CATALOG.some((item) => item.key === key)) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Integration ${key} not found` });
    throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "This integration requires an administrator-configured provider and cannot be toggled locally" });
  }

  async profile(user: { id: string; email: string }): Promise<ProfileSettings> {
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true, locale: true } });
    if (!record) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "User profile not found" });
    return { email: record.email, firstName: record.firstName, lastName: record.lastName ?? undefined, avatarUrl: record.avatarUrl, jobTitle: record.jobTitle ?? undefined, locale: record.locale as ProfileSettings["locale"] };
  }

  async updateProfile(user: { id: string; email: string }, input: UpdateProfileInput): Promise<ProfileSettings> {
    await prisma.user.update({ where: { id: user.id }, data: { firstName: input.firstName, lastName: input.lastName, avatarUrl: input.avatarUrl, jobTitle: input.jobTitle, locale: input.locale as Prisma.InputJsonValue | undefined } });
    return this.profile(user);
  }

  private async membership<T extends Prisma.MembershipInclude | undefined>(userId: string, include?: T): Promise<Prisma.MembershipGetPayload<{ include: T }>> {
    const membership = await prisma.membership.findFirst({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, include });
    if (!membership) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "No active workspace is linked to this account" });
    return membership as Prisma.MembershipGetPayload<{ include: T }>;
  }

  private async audit(actor: GatewayUser, meta: GatewayRequestMeta, companyId: string, action: string, resourceType: string, resourceId: string, metadata?: object): Promise<void> {
    await prisma.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, companyId, action, resourceType, resourceId, metadata: metadata as Prisma.InputJsonValue | undefined, ip: meta.ip, requestId: meta.requestId } });
  }
}

function toTeamRole(platformRole: string, productRole: string): TeamRole {
  if (platformRole === "OWNER") return "OWNER";
  if (platformRole === "ADMIN") return "ADMIN";
  return productRole as TeamRole;
}

function fromTeamRole(role: TeamRole): { platformRole: "ADMIN" | "MEMBER"; productRole: "ADMIN" | "ACCOUNTANT" | "SALES" | "INVENTORY" | "MEMBER" } {
  if (role === "ADMIN") return { platformRole: "ADMIN", productRole: "ADMIN" };
  return { platformRole: "MEMBER", productRole: role as "ACCOUNTANT" | "SALES" | "INVENTORY" | "MEMBER" };
}

function addPeriod(start: Date, period: string): Date {
  const result = new Date(start);
  if (period === "YEARLY") result.setUTCFullYear(result.getUTCFullYear() + 1);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

function featureLabel(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (value) => value.toUpperCase());
}
