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
  createCrmViewInputSchema,
  crmViewListQuerySchema,
  updateCrmViewInputSchema,
  type CrmView,
  type CrmViewListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmViewsService } from "./views.service";

@Controller("sales/crm/views")
@UseGuards(AuthGuard)
export class CrmViewsController {
  constructor(private readonly views: CrmViewsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmViewListResponse> {
    return this.views.list(userFrom(req), metaFrom(req), crmViewListQuerySchema.parse(query));
  }

  @Get(":id")
  detail(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<CrmView> {
    return this.views.detail(userFrom(req), metaFrom(req), id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmView> {
    return this.views.create(userFrom(req), metaFrom(req), createCrmViewInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: unknown): Promise<CrmView> {
    return this.views.update(userFrom(req), metaFrom(req), id, updateCrmViewInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<void> {
    return this.views.remove(userFrom(req), metaFrom(req), id);
  }
}
