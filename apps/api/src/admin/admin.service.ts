import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import { ErrorCode } from "@amni/shared";
import type {
  AdminSummary,
  AdminTenantDetail,
  AdminTenantListQuery,
  AdminTenantListResponse,
  AdminTenantSummary,
  PlanTier,
  ProvisioningJobState,
  ProvisioningJobType,
  SubscriptionStatus,
  TenantHealth,
  TenantStatus,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const TERMINAL_FAILURE_STATES = ["PROVISIONING_FAILED", "CONFIGURATION_FAILED", "VALIDATION_FAILED"] as const;
const TRIAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type PlatformRole = "OWNER" | "ADMIN" | "MEMBER";
type CompanyStatus = "ONBOARDING" | "READY" | "ARCHIVED";
type PlanTierUpper = Uppercase<PlanTier>;

/** Row shape the admin queries project, shared by summary/list/detail. */
interface TenantRow {
  id: string;
  siteName: string;
  siteUrl: string;
  status: TenantStatus;
  planTier: PlanTierUpper;
  erpnextVersion: string;
  hrmsInstalled: boolean;
  region: string;
  createdAt: Date;
  company: {
    name: string;
    slug: string;
    status: CompanyStatus;
    industry: string | null;
    country: string | null;
    subscriptions: Array<{
      status: SubscriptionStatus;
      startsAt: Date;
      trialEndsAt: Date | null;
      endsAt: Date | null;
      cancelledAt: Date | null;
      plan: { name: string; tier: PlanTierUpper };
    }>;
    memberships: Array<{
      platformRole: PlatformRole;
      createdAt: Date;
      user: { id: string; email: string; firstName: string; lastName: string | null };
    }>;
  };
  erpInstance: {
    host: string;
    cluster: string;
    capacityGroup: string;
    health: TenantHealth;
    lastHealthCheckAt: Date | null;
    createdAt: Date;
  } | null;
  provisioningJobs?: Array<{
    id: string;
    type: ProvisioningJobType;
    state: ProvisioningJobState;
    attempts: number;
    maxAttempts: number;
    steps: unknown;
    logs: unknown;
    lastError: string | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>;
}

const asJsonArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

const toPlanTier = (tier: string): PlanTier => tier.toLowerCase() as PlanTier;

@Injectable()
export class AdminService {
  async summary(): Promise<AdminSummary> {
    const [
      totalUsers,
      totalCompanies,
      totalTenants,
      activeSubscriptions,
      trialsExpiringSoon,
      provisioningFailures,
      statusGroups,
      tierGroups,
      recentTenants,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.tenant.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({
        where: { status: "TRIAL", trialEndsAt: { lte: new Date(Date.now() + TRIAL_WINDOW_MS) } },
      }),
      prisma.provisioningJob.count({ where: { state: { in: [...TERMINAL_FAILURE_STATES] } } }),
      prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.tenant.groupBy({ by: ["planTier"], _count: { _all: true } }),
      this.findTenantRows({ orderBy: "desc", take: 5 }),
    ]);

    return {
      totalUsers,
      totalCompanies,
      totalTenants,
      tenantsByStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
      tenantsByTier: Object.fromEntries(tierGroups.map((g) => [g.planTier.toLowerCase(), g._count._all])),
      activeSubscriptions,
      trialsExpiringSoon,
      provisioningFailures,
      recentTenants: recentTenants.map(toSummary),
    };
  }

  async listTenants(query: AdminTenantListQuery): Promise<AdminTenantListResponse> {
    const { page, pageSize, q, status } = query;
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { siteName: { contains: q, mode: "insensitive" as const } },
              { company: { is: { name: { contains: q, mode: "insensitive" as const } } } },
              { company: { is: { slug: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: this.tenantRowInclude(),
      }),
      prisma.tenant.count({ where }),
    ]);

    return {
      items: (rows as TenantRow[]).map(toSummary),
      meta: { total, page, pageSize },
    };
  }

  async tenantDetail(tenantId: string): Promise<AdminTenantDetail> {
    const row = (await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        ...this.tenantRowInclude(),
        provisioningJobs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })) as TenantRow | null;
    if (!row) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Tenant not found" });
    }

    const summary = toSummary(row);
    const members = row.company.memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      platformRole: m.platformRole,
      createdAt: m.createdAt.toISOString(),
    }));
    const subscription = row.company.subscriptions[0];
    const erpInstance = row.erpInstance;

    return {
      ...summary,
      industry: row.company.industry ?? null,
      country: row.company.country ?? null,
      members,
      provisioningJobs: (row.provisioningJobs ?? []).map((job) => ({
        id: job.id,
        type: job.type,
        state: job.state,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        steps: asJsonArray(job.steps),
        logs: asJsonArray(job.logs),
        lastError: job.lastError ?? null,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString() ?? null,
        finishedAt: job.finishedAt?.toISOString() ?? null,
      })),
      subscription: subscription
        ? {
            status: subscription.status,
            planName: subscription.plan.name,
            planTier: toPlanTier(subscription.plan.tier),
            startsAt: subscription.startsAt.toISOString(),
            trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
            endsAt: subscription.endsAt?.toISOString() ?? null,
            cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
          }
        : null,
      erpInstance: erpInstance
        ? {
            host: erpInstance.host,
            cluster: erpInstance.cluster,
            capacityGroup: erpInstance.capacityGroup,
            health: erpInstance.health,
            lastHealthCheckAt: erpInstance.lastHealthCheckAt?.toISOString() ?? null,
            createdAt: erpInstance.createdAt.toISOString(),
          }
        : null,
    };
  }

  private findTenantRows(opts: { orderBy: "desc"; take: number }): Promise<TenantRow[]> {
    return prisma.tenant.findMany({
      orderBy: { createdAt: opts.orderBy },
      take: opts.take,
      include: this.tenantRowInclude(),
    }) as unknown as Promise<TenantRow[]>;
  }

  private tenantRowInclude() {
    return {
      company: {
        select: {
          name: true,
          slug: true,
          status: true,
          industry: true,
          country: true,
          subscriptions: {
            orderBy: { createdAt: "desc" as const },
            take: 1,
            select: {
              status: true,
              startsAt: true,
              trialEndsAt: true,
              endsAt: true,
              cancelledAt: true,
              plan: { select: { name: true, tier: true } },
            },
          },
          memberships: {
            orderBy: { createdAt: "asc" as const },
            select: {
              platformRole: true,
              createdAt: true,
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      erpInstance: true,
    };
  }
}

function toSummary(row: TenantRow): AdminTenantSummary {
  const owner = row.company.memberships.find((m) => m.platformRole === "OWNER");
  const subscription = row.company.subscriptions[0];
  return {
    id: row.id,
    companyName: row.company.name,
    companySlug: row.company.slug,
    companyStatus: row.company.status,
    siteName: row.siteName,
    siteUrl: row.siteUrl,
    status: row.status,
    planTier: toPlanTier(row.planTier),
    erpnextVersion: row.erpnextVersion,
    hrmsInstalled: row.hrmsInstalled,
    region: row.region,
    subscriptionStatus: subscription?.status ?? null,
    trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
    memberCount: row.company.memberships.length,
    ownerEmail: owner?.user.email ?? null,
    health: row.erpInstance?.health ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
