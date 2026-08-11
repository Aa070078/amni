import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import {
  crmWhatsappHistoryQuerySchema,
  sendCrmWhatsappInputSchema,
  type CrmWhatsappHistoryResponse,
  type CrmWhatsappResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmWhatsappService } from "./whatsapp.service";

@Controller("sales/crm/whatsapp")
@UseGuards(AuthGuard)
export class CrmWhatsappController {
  constructor(private readonly whatsapp: CrmWhatsappService) {}

  @Post("send")
  @HttpCode(HttpStatus.CREATED)
  send(@Body() body: unknown): CrmWhatsappResponse {
    return this.whatsapp.send(sendCrmWhatsappInputSchema.parse(body));
  }

  @Get("history")
  history(@Query() query: unknown): CrmWhatsappHistoryResponse {
    return this.whatsapp.history(crmWhatsappHistoryQuerySchema.parse(query));
  }
}
