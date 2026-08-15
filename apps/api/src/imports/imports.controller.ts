import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { createImportInputSchema, importMappingSchema } from "@amni/shared";
import type {
  ImportJob,
  ImportJobListResponse,
  ImportSummary,
  ImportTemplatesResponse,
  ImportValidationResult,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import type { RequestMeta } from "../auth/auth.service";
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import { ApiException } from "../common/api.exception";
import { ErrorCode } from "@amni/shared";
import { MAX_IMPORT_FILE_SIZE } from "./imports-file";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ImportsService } from "./imports.service";

@Controller("imports")
@UseGuards(AuthGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get("templates")
  templates(): Promise<ImportTemplatesResponse> {
    return this.imports.templates();
  }

  @Get("templates/:kind")
  templateCsv(@Param("kind") kind: string, @Res({ passthrough: true }) res: Response): string {
    const csv = this.imports.templateCsv(kind);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${kind}-template.csv"`);
    return csv;
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedRequest["user"]): Promise<ImportJobListResponse> {
    return this.imports.list(user!.id);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthenticatedRequest["user"], @ReqMeta() meta: RequestMeta): Promise<ImportJob> {
    return this.imports.create(createImportInputSchema.parse(body), user!.id, meta);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthenticatedRequest["user"]): Promise<ImportJob> {
    return this.imports.get(id, user!.id);
  }

  @Post(":id/upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }))
  upload(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedRequest["user"],
    @ReqMeta() meta: RequestMeta,
  ): Promise<ImportJob> {
    if (!file) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 400, message: "No file uploaded" });
    }
    return this.imports.upload(id, { filename: file.originalname, size: file.size, buffer: file.buffer }, user!.id, meta);
  }

  @Put(":id/mapping")
  saveMapping(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedRequest["user"],
    @ReqMeta() meta: RequestMeta,
  ): Promise<ImportJob> {
    return this.imports.saveMapping(id, importMappingSchema.parse(body), user!.id, meta);
  }

  @Get(":id/validation")
  validation(@Param("id") id: string, @CurrentUser() user: AuthenticatedRequest["user"]): Promise<ImportValidationResult> {
    return this.imports.validation(id, user!.id);
  }

  @Post(":id/execute")
  execute(@Param("id") id: string, @CurrentUser() user: AuthenticatedRequest["user"], @ReqMeta() meta: RequestMeta): Promise<ImportJob> {
    return this.imports.execute(id, user!.id, meta);
  }

  @Get(":id/summary")
  summary(@Param("id") id: string, @CurrentUser() user: AuthenticatedRequest["user"]): Promise<{ summary: ImportSummary; errorRowsUrl?: string }> {
    return this.imports.summary(id, user!.id);
  }

  @Post(":id/rollback")
  rollback(@Param("id") id: string, @CurrentUser() user: AuthenticatedRequest["user"], @ReqMeta() meta: RequestMeta): Promise<ImportJob> {
    return this.imports.rollback(id, user!.id, meta);
  }
}
