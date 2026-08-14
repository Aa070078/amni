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

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LeadsService } from "./leads.service";

@Controller("sales/leads")
@UseGuards(AuthGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get("pipeline")
  pipeline(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<LeadPipeline> {
    return this.leads.pipeline(userFrom(req), metaFrom(req), leadPipelineQuerySchema.parse(query));
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<LeadListResponse> {
    return this.leads.list(userFrom(req), metaFrom(req), leadListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<LeadDetail> {
    return this.leads.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Lead> {
    return this.leads.create(userFrom(req), metaFrom(req), createLeadInputSchema.parse(body));
  }

  @Patch(":code/stage")
  moveStage(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Lead> {
    return this.leads.moveStage(userFrom(req), metaFrom(req), code, moveLeadStageInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Lead> {
    return this.leads.update(userFrom(req), metaFrom(req), code, updateLeadInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.leads.remove(userFrom(req), metaFrom(req), code);
  }
}
