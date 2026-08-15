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
  createQuotationInputSchema,
  quotationListQuerySchema,
  quotationStatusSchema,
  updateQuotationInputSchema,
  type Quotation,
  type QuotationListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { QuotationsService } from "./quotations.service";

const changeQuotationStatusSchema = z.object({ status: quotationStatusSchema });

@Controller("sales/quotations")
@UseGuards(AuthGuard)
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Get("options")
  options(@Req() req: AuthenticatedRequest): ReturnType<QuotationsService["options"]> {
    return this.quotations.options(userFrom(req), metaFrom(req));
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<QuotationListResponse> {
    return this.quotations.list(userFrom(req), metaFrom(req), quotationListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<Quotation> {
    return this.quotations.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Quotation> {
    return this.quotations.create(userFrom(req), metaFrom(req), createQuotationInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Quotation> {
    return this.quotations.changeStatus(userFrom(req), metaFrom(req), code, changeQuotationStatusSchema.parse(body).status);
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Quotation> {
    return this.quotations.update(userFrom(req), metaFrom(req), code, updateQuotationInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.quotations.remove(userFrom(req), metaFrom(req), code);
  }
}
