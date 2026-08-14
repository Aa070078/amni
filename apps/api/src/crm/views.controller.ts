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
  createCrmViewInputSchema,
  crmViewListQuerySchema,
  updateCrmViewInputSchema,
  type CrmView,
  type CrmViewListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmViewsService } from "./views.service";

@Controller("sales/crm/views")
@UseGuards(AuthGuard)
export class CrmViewsController {
  constructor(private readonly views: CrmViewsService) {}

  @Get()
  list(@Query() query: unknown): CrmViewListResponse {
    return this.views.list(crmViewListQuerySchema.parse(query));
  }

  @Get(":id")
  detail(@Param("id") id: string): CrmView {
    return this.views.detail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): CrmView {
    return this.views.create(createCrmViewInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown): CrmView {
    return this.views.update(id, updateCrmViewInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string): void {
    this.views.remove(id);
  }
}
