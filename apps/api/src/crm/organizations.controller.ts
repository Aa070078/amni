import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  createOrganizationInputSchema,
  organizationListQuerySchema,
  updateOrganizationInputSchema,
  type Organization,
  type OrganizationDetail,
  type OrganizationListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmOrganizationsService } from "./organizations.service";

@Controller("sales/crm/organizations")
@UseGuards(AuthGuard)
export class CrmOrganizationsController {
  constructor(private readonly organizations: CrmOrganizationsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<OrganizationListResponse> {
    return this.organizations.list(userFrom(req), metaFrom(req), organizationListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<OrganizationDetail> {
    return this.organizations.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Organization> {
    return this.organizations.create(userFrom(req), metaFrom(req), createOrganizationInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Organization> {
    return this.organizations.update(userFrom(req), metaFrom(req), code, updateOrganizationInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.organizations.remove(userFrom(req), metaFrom(req), code);
  }
}
