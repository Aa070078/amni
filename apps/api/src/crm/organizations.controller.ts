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

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmOrganizationsService } from "./organizations.service";

@Controller("sales/crm/organizations")
@UseGuards(AuthGuard)
export class CrmOrganizationsController {
  constructor(private readonly organizations: CrmOrganizationsService) {}

  @Get()
  list(@Query() query: unknown): OrganizationListResponse {
    return this.organizations.list(organizationListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): OrganizationDetail {
    return this.organizations.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Organization {
    return this.organizations.create(createOrganizationInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Organization {
    return this.organizations.update(code, updateOrganizationInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.organizations.remove(code);
  }
}
