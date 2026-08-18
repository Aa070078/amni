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

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
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
  overview(@Req() req: AuthenticatedRequest): Promise<SignOverview> {
    return this.sign.overview(userFrom(req), metaFrom(req));
  }

  @Get("requests")
  listRequests(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<SignRequestListResponse> {
    return this.sign.listRequests(userFrom(req), metaFrom(req), signRequestListQuerySchema.parse(query));
  }

  @Get("requests/:code")
  requestDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<SignRequest> {
    return this.sign.detailRequest(userFrom(req), metaFrom(req), code);
  }

  @Post("requests")
  @HttpCode(HttpStatus.CREATED)
  createRequest(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<SignRequest> {
    return this.sign.createRequest(userFrom(req), metaFrom(req), createSignRequestInputSchema.parse(body));
  }

  @Patch("requests/:code/status")
  changeRequestStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<SignRequest> {
    return this.sign.changeRequestStatus(userFrom(req), metaFrom(req), code, changeSignRequestStatusInputSchema.parse(body));
  }

  @Patch("requests/:code/signers/:signerCode/sign")
  markSignerSigned(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Param("signerCode") signerCode: string): Promise<SignRequest> {
    return this.sign.markSignerSigned(userFrom(req), metaFrom(req), code, signerCode);
  }

  @Patch("requests/:code/decline")
  declineRequest(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<SignRequest> {
    return this.sign.declineRequest(userFrom(req), metaFrom(req), code, declineSignRequestInputSchema.parse(body));
  }

  @Patch("requests/:code")
  updateRequest(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<SignRequest> {
    return this.sign.updateRequest(userFrom(req), metaFrom(req), code, updateSignRequestInputSchema.parse(body));
  }

  @Delete("requests/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRequest(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.sign.removeRequest(userFrom(req), metaFrom(req), code);
  }

  @Get("templates")
  listTemplates(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<SignTemplateListResponse> {
    return this.sign.listTemplates(userFrom(req), metaFrom(req), signTemplateListQuerySchema.parse(query));
  }

  @Get("templates/:code")
  templateDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<SignTemplate> {
    return this.sign.templateDetail(userFrom(req), metaFrom(req), code);
  }

  @Post("templates")
  @HttpCode(HttpStatus.CREATED)
  createTemplate(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<SignTemplate> {
    return this.sign.createTemplate(userFrom(req), metaFrom(req), createSignTemplateInputSchema.parse(body));
  }

  @Patch("templates/:code/status")
  changeTemplateStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<SignTemplate> {
    return this.sign.changeTemplateStatus(userFrom(req), metaFrom(req), code, changeSignTemplateStatusInputSchema.parse(body));
  }

  @Patch("templates/:code")
  updateTemplate(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<SignTemplate> {
    return this.sign.updateTemplate(userFrom(req), metaFrom(req), code, updateSignTemplateInputSchema.parse(body));
  }

  @Delete("templates/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTemplate(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.sign.removeTemplate(userFrom(req), metaFrom(req), code);
  }

  @Get("audit")
  listAudit(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<SignAuditResponse> {
    return this.sign.listAudit(userFrom(req), metaFrom(req), signAuditListQuerySchema.parse(query));
  }
}
