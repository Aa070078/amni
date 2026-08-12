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
  createCrmEventInputSchema,
  crmEventListQuerySchema,
  updateCrmEventInputSchema,
  type CrmEvent,
  type CrmEventListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmEventsService } from "./events.service";

@Controller("sales/crm/events")
@UseGuards(AuthGuard)
export class CrmEventsController {
  constructor(private readonly events: CrmEventsService) {}

  @Get()
  list(@Query() query: unknown): CrmEventListResponse {
    return this.events.list(crmEventListQuerySchema.parse(query));
  }

  @Get(":id")
  detail(@Param("id") id: string): CrmEvent {
    return this.events.detail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): CrmEvent {
    return this.events.create(createCrmEventInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown): CrmEvent {
    return this.events.update(id, updateCrmEventInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string): void {
    this.events.remove(id);
  }
}
