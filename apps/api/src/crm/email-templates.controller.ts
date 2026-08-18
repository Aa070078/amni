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
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  createCrmEmailTemplateInputSchema,
  crmEmailTemplatePreviewInputSchema,
  updateCrmEmailTemplateInputSchema,
  type CrmEmailTemplate,
  type CrmEmailTemplateListResponse,
  type CrmEmailTemplatePreview,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmEmailTemplatesService } from "./email-templates.service";

@Controller("sales/crm/email-templates")
@UseGuards(AuthGuard)
export class CrmEmailTemplatesController {
  constructor(private readonly emailTemplates: CrmEmailTemplatesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest): Promise<CrmEmailTemplateListResponse> {
    return this.emailTemplates.list(userFrom(req), metaFrom(req));
  }

  @Post("preview")
  @HttpCode(HttpStatus.OK)
  preview(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmEmailTemplatePreview> {
    return this.emailTemplates.preview(userFrom(req), metaFrom(req), crmEmailTemplatePreviewInputSchema.parse(body));
  }

  @Get(":id")
  detail(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<CrmEmailTemplate> {
    return this.emailTemplates.detail(userFrom(req), metaFrom(req), id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmEmailTemplate> {
    return this.emailTemplates.create(userFrom(req), metaFrom(req), createCrmEmailTemplateInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: unknown): Promise<CrmEmailTemplate> {
    return this.emailTemplates.update(userFrom(req), metaFrom(req), id, updateCrmEmailTemplateInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<void> {
    return this.emailTemplates.remove(userFrom(req), metaFrom(req), id);
  }
}
