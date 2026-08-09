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
  createQuotationInputSchema,
  quotationListQuerySchema,
  quotationStatusSchema,
  updateQuotationInputSchema,
  type Quotation,
  type QuotationListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { QuotationsService } from "./quotations.service";

const changeQuotationStatusSchema = z.object({ status: quotationStatusSchema });

@Controller("sales/quotations")
@UseGuards(AuthGuard)
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Get("options")
  options(): ReturnType<QuotationsService["options"]> {
    return this.quotations.options();
  }

  @Get()
  list(@Query() query: unknown): QuotationListResponse {
    return this.quotations.list(quotationListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): Quotation {
    return this.quotations.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Quotation {
    return this.quotations.create(createQuotationInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(@Param("code") code: string, @Body() body: unknown): Quotation {
    return this.quotations.changeStatus(code, changeQuotationStatusSchema.parse(body).status);
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Quotation {
    return this.quotations.update(code, updateQuotationInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.quotations.remove(code);
  }
}
