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
  createSignRequestInputSchema,
  createSignTemplateInputSchema,
  declineSignRequestInputSchema,
  signAuditListQuerySchema,
  signRequestListQuerySchema,
  signRequestStatusSchema,
  signTemplateListQuerySchema,
  signTemplateStatusSchema,
  updateSignRequestInputSchema,
  updateSignTemplateInputSchema,
  type SignAuditResponse,
  type SignOverview,
  type SignRequest,
  type SignRequestListResponse,
  type SignTemplate,
  type SignTemplateListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SignService } from "./sign.service";

const changeSignRequestStatusInputSchema = z.object({ status: signRequestStatusSchema });
const changeSignTemplateStatusInputSchema = z.object({ status: signTemplateStatusSchema });

@Controller("sign")
@UseGuards(AuthGuard)
export class SignController {
  constructor(private readonly sign: SignService) {}

  @Get("overview")
  overview(): SignOverview {
    return this.sign.overview();
  }

  @Get("requests")
  listRequests(@Query() query: unknown): SignRequestListResponse {
    return this.sign.listRequests(signRequestListQuerySchema.parse(query));
  }

  @Get("requests/:code")
  requestDetail(@Param("code") code: string): SignRequest {
    return this.sign.detailRequest(code);
  }

  @Post("requests")
  @HttpCode(HttpStatus.CREATED)
  createRequest(@Body() body: unknown): SignRequest {
    return this.sign.createRequest(createSignRequestInputSchema.parse(body));
  }

  @Patch("requests/:code/status")
  changeRequestStatus(@Param("code") code: string, @Body() body: unknown): SignRequest {
    return this.sign.changeRequestStatus(code, changeSignRequestStatusInputSchema.parse(body));
  }

  @Patch("requests/:code/signers/:signerCode/sign")
  markSignerSigned(@Param("code") code: string, @Param("signerCode") signerCode: string): SignRequest {
    return this.sign.markSignerSigned(code, signerCode);
  }

  @Patch("requests/:code/decline")
  declineRequest(@Param("code") code: string, @Body() body: unknown): SignRequest {
    return this.sign.declineRequest(code, declineSignRequestInputSchema.parse(body));
  }

  @Patch("requests/:code")
  updateRequest(@Param("code") code: string, @Body() body: unknown): SignRequest {
    return this.sign.updateRequest(code, updateSignRequestInputSchema.parse(body));
  }

  @Delete("requests/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRequest(@Param("code") code: string): void {
    this.sign.removeRequest(code);
  }

  @Get("templates")
  listTemplates(@Query() query: unknown): SignTemplateListResponse {
    return this.sign.listTemplates(signTemplateListQuerySchema.parse(query));
  }

  @Get("templates/:code")
  templateDetail(@Param("code") code: string): SignTemplate {
    return this.sign.detailTemplate(code);
  }

  @Post("templates")
  @HttpCode(HttpStatus.CREATED)
  createTemplate(@Body() body: unknown): SignTemplate {
    return this.sign.createTemplate(createSignTemplateInputSchema.parse(body));
  }

  @Patch("templates/:code/status")
  changeTemplateStatus(@Param("code") code: string, @Body() body: unknown): SignTemplate {
    return this.sign.changeTemplateStatus(code, changeSignTemplateStatusInputSchema.parse(body));
  }

  @Patch("templates/:code")
  updateTemplate(@Param("code") code: string, @Body() body: unknown): SignTemplate {
    return this.sign.updateTemplate(code, updateSignTemplateInputSchema.parse(body));
  }

  @Delete("templates/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTemplate(@Param("code") code: string): void {
    this.sign.removeTemplate(code);
  }

  @Get("audit")
  listAudit(@Query() query: unknown): SignAuditResponse {
    return this.sign.listAudit(signAuditListQuerySchema.parse(query));
  }
}
