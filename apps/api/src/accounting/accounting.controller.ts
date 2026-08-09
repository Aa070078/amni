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

import { AuthGuard } from "../auth/auth.guard";
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
  overview(): AccountingOverview {
    return this.accounting.overview();
  }

  @Get("accounts")
  listAccounts(@Query() query: unknown): AccountListResponse {
    return this.accounting.listAccounts(accountListQuerySchema.parse(query));
  }

  @Get("accounts/:code")
  accountDetail(@Param("code") code: string): Account {
    return this.accounting.detailAccount(code);
  }

  @Post("accounts")
  @HttpCode(HttpStatus.CREATED)
  createAccount(@Body() body: unknown): Account {
    return this.accounting.createAccount(createAccountInputSchema.parse(body));
  }

  @Patch("accounts/:code/status")
  changeAccountStatus(@Param("code") code: string, @Body() body: unknown): Account {
    return this.accounting.changeAccountStatus(code, changeAccountStatusInputSchema.parse(body));
  }

  @Patch("accounts/:code")
  updateAccount(@Param("code") code: string, @Body() body: unknown): Account {
    return this.accounting.updateAccount(code, updateAccountInputSchema.parse(body));
  }

  @Delete("accounts/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAccount(@Param("code") code: string): void {
    this.accounting.removeAccount(code);
  }

  @Get("journal-entries")
  listJournalEntries(@Query() query: unknown): JournalEntryListResponse {
    return this.accounting.listJournalEntries(journalEntryListQuerySchema.parse(query));
  }

  @Get("journal-entries/:code")
  journalEntryDetail(@Param("code") code: string): JournalEntry {
    return this.accounting.detailJournalEntry(code);
  }

  @Post("journal-entries")
  @HttpCode(HttpStatus.CREATED)
  createJournalEntry(@Body() body: unknown): JournalEntry {
    return this.accounting.createJournalEntry(createJournalEntryInputSchema.parse(body));
  }

  @Patch("journal-entries/:code/status")
  changeJournalEntryStatus(@Param("code") code: string, @Body() body: unknown): JournalEntry {
    const { status } = changeJournalStatusInputSchema.parse(body);
    if (status === "posted") return this.accounting.postJournalEntry(code);
    if (status === "reversed") return this.accounting.reverseJournalEntry(code);
    return this.accounting.updateJournalEntry(code, {});
  }

  @Patch("journal-entries/:code")
  updateJournalEntry(@Param("code") code: string, @Body() body: unknown): JournalEntry {
    return this.accounting.updateJournalEntry(code, updateJournalEntryInputSchema.parse(body));
  }

  @Delete("journal-entries/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeJournalEntry(@Param("code") code: string): void {
    this.accounting.removeJournalEntry(code);
  }

  @Get("reports/trial-balance")
  trialBalance(): TrialBalance {
    return this.accounting.trialBalance();
  }

  @Get("ledger/:accountCode")
  ledger(@Param("accountCode") accountCode: string): Ledger {
    return this.accounting.ledger(accountCode);
  }
}
