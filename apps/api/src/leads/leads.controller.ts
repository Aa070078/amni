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
  createLeadInputSchema,
  leadListQuerySchema,
  leadPipelineQuerySchema,
  moveLeadStageInputSchema,
  updateLeadInputSchema,
  type Lead,
  type LeadDetail,
  type LeadListResponse,
  type LeadPipeline,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LeadsService } from "./leads.service";

@Controller("sales/leads")
@UseGuards(AuthGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get("pipeline")
  pipeline(@Query() query: unknown): LeadPipeline {
    return this.leads.pipeline(leadPipelineQuerySchema.parse(query));
  }

  @Get()
  list(@Query() query: unknown): LeadListResponse {
    return this.leads.list(leadListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): LeadDetail {
    return this.leads.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Lead {
    return this.leads.create(createLeadInputSchema.parse(body));
  }

  @Patch(":code/stage")
  moveStage(@Param("code") code: string, @Body() body: unknown): Lead {
    return this.leads.moveStage(code, moveLeadStageInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Lead {
    return this.leads.update(code, updateLeadInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.leads.remove(code);
  }
}
