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

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmEmailTemplatesService } from "./email-templates.service";

@Controller("sales/crm/email-templates")
@UseGuards(AuthGuard)
export class CrmEmailTemplatesController {
  constructor(private readonly emailTemplates: CrmEmailTemplatesService) {}

  @Get()
  list(): CrmEmailTemplateListResponse {
    return this.emailTemplates.list();
  }

  @Post("preview")
  @HttpCode(HttpStatus.OK)
  preview(@Body() body: unknown): CrmEmailTemplatePreview {
    return this.emailTemplates.preview(crmEmailTemplatePreviewInputSchema.parse(body));
  }

  @Get(":id")
  detail(@Param("id") id: string): CrmEmailTemplate {
    return this.emailTemplates.detail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): CrmEmailTemplate {
    return this.emailTemplates.create(createCrmEmailTemplateInputSchema.parse(body));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown): CrmEmailTemplate {
    return this.emailTemplates.update(id, updateCrmEmailTemplateInputSchema.parse(body));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string): void {
    this.emailTemplates.remove(id);
  }
}
