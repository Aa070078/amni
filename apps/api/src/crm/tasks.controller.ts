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
import { z } from "zod";
import {
  crmTaskListQuerySchema,
  createCrmTaskInputSchema,
  updateCrmTaskInputSchema,
  type CrmTask,
  type CrmTaskBoard,
  type CrmTaskListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmTasksService } from "./tasks.service";

@Controller("sales/crm/tasks")
@UseGuards(AuthGuard)
export class CrmTasksController {
  constructor(private readonly tasks: CrmTasksService) {}

  @Get("board")
  board(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmTaskBoard> {
    const parsed = crmTaskListQuerySchema.parse(query);
    return this.tasks.board(userFrom(req), metaFrom(req), { q: parsed.q });
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmTaskListResponse> {
    return this.tasks.list(userFrom(req), metaFrom(req), crmTaskListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<CrmTask> {
    return this.tasks.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmTask> {
    return this.tasks.create(userFrom(req), metaFrom(req), createCrmTaskInputSchema.parse(body));
  }

  @Patch(":code/status")
  setStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<CrmTask> {
    const parsed = setStatusInputSchema.parse(body);
    return this.tasks.setStatus(userFrom(req), metaFrom(req), code, parsed.status);
  }

  @Patch(":code")
  update(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<CrmTask> {
    return this.tasks.update(userFrom(req), metaFrom(req), code, updateCrmTaskInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.tasks.remove(userFrom(req), metaFrom(req), code);
  }
}

const setStatusInputSchema = z.object({
  status: z.enum(["backlog", "working", "review", "done", "cancelled"]),
});
