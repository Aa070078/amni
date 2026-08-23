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
  createCrmEventInputSchema,
  crmEventListQuerySchema,
  updateCrmEventInputSchema,
  type CrmEvent,
  type CrmEventListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmEventsService } from "./events.service";

@Controller("sales/crm/events")
@UseGuards(AuthGuard)
export class CrmEventsController {
  constructor(private readonly events: CrmEventsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmEventListResponse> {
    return this.events.list(userFrom(req), metaFrom(req), crmEventListQuerySchema.parse(query));
  }

  @Get(":id")
  detail(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<CrmEvent> {
    return this.events.detail(userFrom(req), metaFrom(req), id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmEvent> {
    return this.events.create(userFrom(req), metaFrom(req), createCrmEventInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: unknown): Promise<CrmEvent> {
    return this.events.update(userFrom(req), metaFrom(req), id, updateCrmEventInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<void> {
    return this.events.remove(userFrom(req), metaFrom(req), id);
  }
}
