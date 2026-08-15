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
import { z } from "zod";
import {
  crmTaskListQuerySchema,
  createCrmTaskInputSchema,
  updateCrmTaskInputSchema,
  type CrmTask,
  type CrmTaskBoard,
  type CrmTaskListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmTasksService } from "./tasks.service";

@Controller("sales/crm/tasks")
@UseGuards(AuthGuard)
export class CrmTasksController {
  constructor(private readonly tasks: CrmTasksService) {}

  @Get("board")
  board(@Query() query: unknown): CrmTaskBoard {
    const parsed = crmTaskListQuerySchema.parse(query);
    return this.tasks.board({ q: parsed.q });
  }

  @Get()
  list(@Query() query: unknown): CrmTaskListResponse {
    return this.tasks.list(crmTaskListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): CrmTask {
    return this.tasks.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): CrmTask {
    return this.tasks.create(createCrmTaskInputSchema.parse(body));
  }

  @Patch(":code/status")
  setStatus(@Param("code") code: string, @Body() body: unknown): CrmTask {
    const parsed = setStatusInputSchema.parse(body);
    return this.tasks.setStatus(code, parsed.status);
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): CrmTask {
    return this.tasks.update(code, updateCrmTaskInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.tasks.remove(code);
  }
}

const setStatusInputSchema = z.object({
  status: z.enum(["backlog", "working", "review", "done", "cancelled"]),
});
