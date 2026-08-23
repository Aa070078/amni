import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type {
  AdminSummary,
  AdminTenantDetail,
  AdminTenantListQuery,
  AdminTenantListResponse,
  AdminTenantSummary,
  AdminUserDetail,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminUserSummary,
  PlanTier,
} from "@amni/shared";
import { adminTenantListQuerySchema, adminUserListQuerySchema } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "./admin.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AdminService } from "./admin.service";

const uuidSchema = z.string().uuid();
const planTierSchema = z.enum(["trial", "starter", "growth", "scale"]);

@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ─── Overview ──────────────────────────────────────────────────────

  @Get("summary")
  summary(): Promise<AdminSummary> {
    return this.admin.summary();
  }

  // ─── Tenants ───────────────────────────────────────────────────────

  @Get("tenants")
  listTenants(@Query() query: unknown): Promise<AdminTenantListResponse> {
    return this.admin.listTenants(adminTenantListQuerySchema.parse(query) as AdminTenantListQuery);
  }

  @Get("tenants/:id")
  tenantDetail(@Param("id") id: string): Promise<AdminTenantDetail> {
    return this.admin.tenantDetail(uuidSchema.parse(id));
  }

  @Post("tenants/:id/suspend")
  suspendTenant(@Param("id") id: string): Promise<AdminTenantSummary> {
    return this.admin.suspendTenant(uuidSchema.parse(id));
  }

  @Post("tenants/:id/resume")
  resumeTenant(@Param("id") id: string): Promise<AdminTenantSummary> {
    return this.admin.resumeTenant(uuidSchema.parse(id));
  }

  @Post("tenants/:id/archive")
  archiveTenant(@Param("id") id: string): Promise<AdminTenantSummary> {
    return this.admin.archiveTenant(uuidSchema.parse(id));
  }

  @Patch("tenants/:id/plan")
  changeTenantPlan(@Param("id") id: string, @Body() body: unknown): Promise<AdminTenantSummary> {
    const { planTier } = z.object({ planTier: planTierSchema }).parse(body);
    return this.admin.changeTenantPlan(uuidSchema.parse(id), planTier as PlanTier);
  }

  // ─── Users ─────────────────────────────────────────────────────────

  @Get("users")
  listUsers(@Query() query: unknown): Promise<AdminUserListResponse> {
    return this.admin.listUsers(adminUserListQuerySchema.parse(query) as AdminUserListQuery);
  }

  @Get("users/:id")
  userDetail(@Param("id") id: string): Promise<AdminUserDetail> {
    return this.admin.userDetail(uuidSchema.parse(id));
  }

  @Post("users/:id/suspend")
  suspendUser(@Param("id") id: string): Promise<AdminUserSummary> {
    return this.admin.suspendUser(uuidSchema.parse(id));
  }

  @Post("users/:id/activate")
  activateUser(@Param("id") id: string): Promise<AdminUserSummary> {
    return this.admin.activateUser(uuidSchema.parse(id));
  }

  @Post("users/:id/promote")
  promoteUser(@Param("id") id: string): Promise<AdminUserSummary> {
    return this.admin.promoteUser(uuidSchema.parse(id));
  }

  @Post("users/:id/demote")
  demoteUser(@Param("id") id: string): Promise<AdminUserSummary> {
    return this.admin.demoteUser(uuidSchema.parse(id));
  }
}
