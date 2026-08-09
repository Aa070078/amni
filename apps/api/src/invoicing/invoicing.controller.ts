import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import {
  createCreditNoteInputSchema,
  createRecurringProfileInputSchema,
  creditNoteListQuerySchema,
  creditNoteStatusSchema,
  recurringListQuerySchema,
  recurringProfileStatusSchema,
  updateCreditNoteInputSchema,
  updateRecurringProfileInputSchema,
  type CreditNote,
  type CreditNoteListResponse,
  type InvoicingOverview,
  type RecurringProfile,
  type RecurringListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { InvoicingService } from "./invoicing.service";

const changeCreditNoteStatusInputSchema = z.object({ status: creditNoteStatusSchema });
const changeRecurringStatusInputSchema = z.object({ status: recurringProfileStatusSchema });

@Controller("invoicing")
@UseGuards(AuthGuard)
export class InvoicingController {
  constructor(private readonly invoicing: InvoicingService) {}

  @Get("overview")
  overview(): InvoicingOverview {
    return this.invoicing.overview();
  }

  @Get("credit-notes")
  listCreditNotes(@Query() query: unknown): CreditNoteListResponse {
    return this.invoicing.listCreditNotes(creditNoteListQuerySchema.parse(query));
  }

  @Get("credit-notes/:code")
  creditNoteDetail(@Param("code") code: string): CreditNote {
    return this.invoicing.detailCreditNote(code);
  }

  @Post("credit-notes")
  @HttpCode(HttpStatus.CREATED)
  createCreditNote(@Body() body: unknown): CreditNote {
    return this.invoicing.createCreditNote(createCreditNoteInputSchema.parse(body));
  }

  @Patch("credit-notes/:code/status")
  changeCreditNoteStatus(@Param("code") code: string, @Body() body: unknown): CreditNote {
    return this.invoicing.changeCreditNoteStatus(code, changeCreditNoteStatusInputSchema.parse(body));
  }

  @Patch("credit-notes/:code")
  updateCreditNote(@Param("code") code: string, @Body() body: unknown): CreditNote {
    return this.invoicing.updateCreditNote(code, updateCreditNoteInputSchema.parse(body));
  }

  @Delete("credit-notes/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCreditNote(@Param("code") code: string): void {
    this.invoicing.removeCreditNote(code);
  }

  @Get("recurring")
  listRecurring(@Query() query: unknown): RecurringListResponse {
    return this.invoicing.listRecurring(recurringListQuerySchema.parse(query));
  }

  @Get("recurring/:code")
  recurringDetail(@Param("code") code: string): RecurringProfile {
    return this.invoicing.detailRecurring(code);
  }

  @Post("recurring")
  @HttpCode(HttpStatus.CREATED)
  createRecurring(@Body() body: unknown): RecurringProfile {
    return this.invoicing.createRecurring(createRecurringProfileInputSchema.parse(body));
  }

  @Patch("recurring/:code/status")
  changeRecurringStatus(@Param("code") code: string, @Body() body: unknown): RecurringProfile {
    return this.invoicing.changeRecurringStatus(code, changeRecurringStatusInputSchema.parse(body));
  }

  @Patch("recurring/:code")
  updateRecurring(@Param("code") code: string, @Body() body: unknown): RecurringProfile {
    return this.invoicing.updateRecurring(code, updateRecurringProfileInputSchema.parse(body));
  }

  @Delete("recurring/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRecurring(@Param("code") code: string): void {
    this.invoicing.removeRecurring(code);
  }
}
