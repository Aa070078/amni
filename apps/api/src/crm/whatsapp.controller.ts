import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  crmWhatsappHistoryQuerySchema,
  sendCrmWhatsappInputSchema,
  type CrmWhatsappHistoryResponse,
  type CrmWhatsappResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmWhatsappService } from "./whatsapp.service";

@Controller("sales/crm/whatsapp")
@UseGuards(AuthGuard)
export class CrmWhatsappController {
  constructor(private readonly whatsapp: CrmWhatsappService) {}

  @Post("send")
  @HttpCode(HttpStatus.CREATED)
  send(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmWhatsappResponse> {
    return this.whatsapp.send(userFrom(req), metaFrom(req), sendCrmWhatsappInputSchema.parse(body));
  }

  @Get("history")
  history(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmWhatsappHistoryResponse> {
    return this.whatsapp.history(userFrom(req), metaFrom(req), crmWhatsappHistoryQuerySchema.parse(query));
  }
}
