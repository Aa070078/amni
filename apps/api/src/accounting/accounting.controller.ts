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
  accountListQuerySchema,
  accountStatusSchema,
  createAccountInputSchema,
  createJournalEntryInputSchema,
  journalEntryListQuerySchema,
  journalEntryStatusSchema,
  updateAccountInputSchema,
  updateJournalEntryInputSchema,
  type Account,
  type AccountListResponse,
  type AccountingOverview,
  type JournalEntry,
  type JournalEntryListResponse,
  type Ledger,
  type TrialBalance,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AccountingService } from "./accounting.service";

const changeAccountStatusInputSchema = z.object({ status: accountStatusSchema });
const changeJournalStatusInputSchema = z.object({ status: journalEntryStatusSchema });

@Controller("accounting")
@UseGuards(AuthGuard)
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get("overview")
  overview(@Req() req: AuthenticatedRequest): Promise<AccountingOverview> {
    return this.accounting.overview(userFrom(req), metaFrom(req));
  }

  @Get("accounts")
  listAccounts(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<AccountListResponse> {
    return this.accounting.listAccounts(userFrom(req), metaFrom(req), accountListQuerySchema.parse(query));
  }

  @Get("accounts/:code")
  accountDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<Account> {
    return this.accounting.detailAccount(userFrom(req), metaFrom(req), code);
  }

  @Post("accounts")
  @HttpCode(HttpStatus.CREATED)
  createAccount(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Account> {
    return this.accounting.createAccount(userFrom(req), metaFrom(req), createAccountInputSchema.parse(body));
  }

  @Patch("accounts/:code/status")
  changeAccountStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Account> {
    return this.accounting.changeAccountStatus(userFrom(req), metaFrom(req), code, changeAccountStatusInputSchema.parse(body));
  }

  @Patch("accounts/:code")
  updateAccount(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Account> {
    return this.accounting.updateAccount(userFrom(req), metaFrom(req), code, updateAccountInputSchema.parse(body));
  }

  @Delete("accounts/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAccount(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.accounting.removeAccount(userFrom(req), metaFrom(req), code);
  }

  @Get("journal-entries")
  listJournalEntries(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<JournalEntryListResponse> {
    return this.accounting.listJournalEntries(userFrom(req), metaFrom(req), journalEntryListQuerySchema.parse(query));
  }

  @Get("journal-entries/:code")
  journalEntryDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<JournalEntry> {
    return this.accounting.detailJournalEntry(userFrom(req), metaFrom(req), code);
  }

  @Post("journal-entries")
  @HttpCode(HttpStatus.CREATED)
  createJournalEntry(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<JournalEntry> {
    return this.accounting.createJournalEntry(userFrom(req), metaFrom(req), createJournalEntryInputSchema.parse(body));
  }

  @Patch("journal-entries/:code/status")
  changeJournalEntryStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<JournalEntry> {
    const { status } = changeJournalStatusInputSchema.parse(body);
    if (status === "posted") return this.accounting.postJournalEntry(userFrom(req), metaFrom(req), code);
    if (status === "reversed") return this.accounting.reverseJournalEntry(userFrom(req), metaFrom(req), code);
    return this.accounting.updateJournalEntry(userFrom(req), metaFrom(req), code, {});
  }

  @Patch("journal-entries/:code")
  updateJournalEntry(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<JournalEntry> {
    return this.accounting.updateJournalEntry(userFrom(req), metaFrom(req), code, updateJournalEntryInputSchema.parse(body));
  }

  @Delete("journal-entries/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeJournalEntry(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.accounting.removeJournalEntry(userFrom(req), metaFrom(req), code);
  }

  @Get("reports/trial-balance")
  trialBalance(@Req() req: AuthenticatedRequest): Promise<TrialBalance> {
    return this.accounting.trialBalance(userFrom(req), metaFrom(req));
  }

  @Get("ledger/:accountCode")
  ledger(@Req() req: AuthenticatedRequest, @Param("accountCode") accountCode: string): Promise<Ledger> {
    return this.accounting.ledger(userFrom(req), metaFrom(req), accountCode);
  }
}
