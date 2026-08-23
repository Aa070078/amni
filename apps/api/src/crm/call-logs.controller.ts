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
  createCrmCallLogInputSchema,
  crmCallLogListQuerySchema,
  updateCrmCallLogInputSchema,
  type CrmCallLog,
  type CrmCallLogListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmCallLogsService } from "./call-logs.service";

@Controller("sales/crm/call-logs")
@UseGuards(AuthGuard)
export class CrmCallLogsController {
  constructor(private readonly callLogs: CrmCallLogsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmCallLogListResponse> {
    return this.callLogs.list(userFrom(req), metaFrom(req), crmCallLogListQuerySchema.parse(query));
  }

  @Get(":id")
  detail(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<CrmCallLog> {
    return this.callLogs.detail(userFrom(req), metaFrom(req), id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmCallLog> {
    return this.callLogs.create(userFrom(req), metaFrom(req), createCrmCallLogInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: unknown): Promise<CrmCallLog> {
    return this.callLogs.update(userFrom(req), metaFrom(req), id, updateCrmCallLogInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<void> {
    return this.callLogs.remove(userFrom(req), metaFrom(req), id);
  }
}
