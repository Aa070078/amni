import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
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

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
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
  overview(@Req() req: AuthenticatedRequest): Promise<InvoicingOverview> {
    return this.invoicing.overview(userFrom(req), metaFrom(req));
  }

  @Get("credit-notes")
  listCreditNotes(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CreditNoteListResponse> {
    return this.invoicing.listCreditNotes(userFrom(req), metaFrom(req), creditNoteListQuerySchema.parse(query));
  }

  @Get("credit-notes/:code")
  creditNoteDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<CreditNote> {
    return this.invoicing.detailCreditNote(userFrom(req), metaFrom(req), code);
  }

  @Post("credit-notes")
  @HttpCode(HttpStatus.CREATED)
  createCreditNote(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CreditNote> {
    return this.invoicing.createCreditNote(userFrom(req), metaFrom(req), createCreditNoteInputSchema.parse(body));
  }

  @Patch("credit-notes/:code/status")
  changeCreditNoteStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<CreditNote> {
    return this.invoicing.changeCreditNoteStatus(userFrom(req), metaFrom(req), code, changeCreditNoteStatusInputSchema.parse(body));
  }

  @Patch("credit-notes/:code")
  updateCreditNote(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<CreditNote> {
    return this.invoicing.updateCreditNote(userFrom(req), metaFrom(req), code, updateCreditNoteInputSchema.parse(body));
  }

  @Delete("credit-notes/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCreditNote(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.invoicing.removeCreditNote(userFrom(req), metaFrom(req), code);
  }

  @Get("recurring")
  listRecurring(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<RecurringListResponse> {
    return this.invoicing.listRecurring(userFrom(req), metaFrom(req), recurringListQuerySchema.parse(query));
  }

  @Get("recurring/:code")
  recurringDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<RecurringProfile> {
    return this.invoicing.detailRecurring(userFrom(req), metaFrom(req), code);
  }

  @Post("recurring")
  @HttpCode(HttpStatus.CREATED)
  createRecurring(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<RecurringProfile> {
    return this.invoicing.createRecurring(userFrom(req), metaFrom(req), createRecurringProfileInputSchema.parse(body));
  }

  @Patch("recurring/:code/status")
  changeRecurringStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<RecurringProfile> {
    return this.invoicing.changeRecurringStatus(userFrom(req), metaFrom(req), code, changeRecurringStatusInputSchema.parse(body));
  }

  @Patch("recurring/:code")
  updateRecurring(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<RecurringProfile> {
    return this.invoicing.updateRecurring(userFrom(req), metaFrom(req), code, updateRecurringProfileInputSchema.parse(body));
  }

  @Delete("recurring/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRecurring(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.invoicing.removeRecurring(userFrom(req), metaFrom(req), code);
  }
}
