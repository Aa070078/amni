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
  createCrmCallLogInputSchema,
  crmCallLogListQuerySchema,
  updateCrmCallLogInputSchema,
  type CrmCallLog,
  type CrmCallLogListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmCallLogsService } from "./call-logs.service";

@Controller("sales/crm/call-logs")
@UseGuards(AuthGuard)
export class CrmCallLogsController {
  constructor(private readonly callLogs: CrmCallLogsService) {}

  @Get()
  list(@Query() query: unknown): CrmCallLogListResponse {
    return this.callLogs.list(crmCallLogListQuerySchema.parse(query));
  }

  @Get(":id")
  detail(@Param("id") id: string): CrmCallLog {
    return this.callLogs.detail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): CrmCallLog {
    return this.callLogs.create(createCrmCallLogInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown): CrmCallLog {
    return this.callLogs.update(id, updateCrmCallLogInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string): void {
    this.callLogs.remove(id);
  }
}
