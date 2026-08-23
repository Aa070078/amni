import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { AdminSummary, AdminTenantDetail, AdminTenantListQuery, AdminTenantListResponse } from "@amni/shared";
import { adminTenantListQuerySchema } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "./admin.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AdminService } from "./admin.service";

const tenantIdSchema = z.string().uuid();

@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("summary")
  summary(): Promise<AdminSummary> {
    return this.admin.summary();
  }

  @Get("tenants")
  list(@Query() query: unknown): Promise<AdminTenantListResponse> {
    return this.admin.listTenants(adminTenantListQuerySchema.parse(query) as AdminTenantListQuery);
  }

  @Get("tenants/:id")
  detail(@Param("id") id: string): Promise<AdminTenantDetail> {
    return this.admin.tenantDetail(tenantIdSchema.parse(id));
  }
}
