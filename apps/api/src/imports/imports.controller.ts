import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import {
  createImportJobInputSchema,
  importJobListQuerySchema,
  setImportFileInputSchema,
  setImportMappingInputSchema,
  type ImportErrorRowsResponse,
  type ImportJob,
  type ImportJobListResponse,
  type ImportTemplate,
  type ImportValidation,
  type StartImportResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/request.decorators";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ImportsService } from "./imports.service";

@Controller("imports")
@UseGuards(AuthGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get("templates")
  templates(): ImportTemplate[] {
    return this.imports.templates();
  }

  @Post("jobs")
  @HttpCode(HttpStatus.CREATED)
  createJob(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: unknown,
  ): Promise<ImportJob> {
    return this.imports.createJob(user, createImportJobInputSchema.parse(body));
  }

  @Get("jobs")
  list(
    @CurrentUser() user: { id: string; email: string },
    @Query() query: unknown,
  ): Promise<ImportJobListResponse> {
    return this.imports.list(user.id, importJobListQuerySchema.parse(query));
  }

  @Get("jobs/:id")
  detail(
    @CurrentUser() user: { id: string; email: string },
    @Param("id") id: string,
  ): Promise<ImportJob> {
    return this.imports.detail(user.id, id);
  }

  @Put("jobs/:id/file")
  setFile(
    @CurrentUser() user: { id: string; email: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<ImportJob> {
    return this.imports.setFile(user, id, setImportFileInputSchema.parse(body));
  }

  @Put("jobs/:id/mapping")
  setMapping(
    @CurrentUser() user: { id: string; email: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<ImportJob> {
    return this.imports.setMapping(user, id, setImportMappingInputSchema.parse(body));
  }

  @Post("jobs/:id/validate")
  @HttpCode(HttpStatus.OK)
  validate(
    @CurrentUser() user: { id: string; email: string },
    @Param("id") id: string,
  ): Promise<ImportValidation> {
    return this.imports.validate(user, id);
  }

  @Post("jobs/:id/import")
  @HttpCode(HttpStatus.OK)
  start(
    @CurrentUser() user: { id: string; email: string },
    @Param("id") id: string,
  ): Promise<StartImportResponse> {
    return this.imports.start(user, id);
  }

  @Get("jobs/:id/error-rows")
  errorRows(
    @CurrentUser() user: { id: string; email: string },
    @Param("id") id: string,
  ): Promise<ImportErrorRowsResponse> {
    return this.imports.errorRows(user.id, id);
  }
}
