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
  createExpenseCategoryInputSchema,
  createExpenseClaimInputSchema,
  createExpenseInputSchema,
  expenseCategoryRecordStatusSchema,
  expenseClaimListQuerySchema,
  expenseClaimStatusSchema,
  expenseListQuerySchema,
  expenseStatusSchema,
  expenseCategoryListQuerySchema,
  updateExpenseCategoryInputSchema,
  updateExpenseClaimInputSchema,
  updateExpenseInputSchema,
  type Expense,
  type ExpenseCategoryListResponse,
  type ExpenseCategoryRecord,
  type ExpenseClaim,
  type ExpenseClaimListResponse,
  type ExpenseListResponse,
  type ExpensesOverview,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import type { RequestMeta } from "../auth/auth.service";
import type { GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ExpensesService } from "./expenses.service";

const changeExpenseStatusInputSchema = z.object({ status: expenseStatusSchema });
const changeClaimStatusInputSchema = z.object({ status: expenseClaimStatusSchema });
const changeCategoryStatusInputSchema = z.object({ status: expenseCategoryRecordStatusSchema });

@Controller("finance/expenses")
@UseGuards(AuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get("overview")
  overview(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<ExpensesOverview> {
    return this.expenses.overview(user, meta);
  }

  @Get("claims")
  listClaims(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Query() query: unknown,
  ): Promise<ExpenseClaimListResponse> {
    return this.expenses.listClaims(user, meta, expenseClaimListQuerySchema.parse(query));
  }

  @Get("claims/:code")
  claimDetail(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<ExpenseClaim> {
    return this.expenses.detailClaim(user, meta, code);
  }

  @Post("claims")
  @HttpCode(HttpStatus.CREATED)
  createClaim(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Body() body: unknown,
  ): Promise<ExpenseClaim> {
    return this.expenses.createClaim(user, meta, createExpenseClaimInputSchema.parse(body));
  }

  @Patch("claims/:code/status")
  changeClaimStatus(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<ExpenseClaim> {
    return this.expenses.changeClaimStatus(user, meta, code, changeClaimStatusInputSchema.parse(body));
  }

  @Patch("claims/:code")
  updateClaim(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<ExpenseClaim> {
    return this.expenses.updateClaim(user, meta, code, updateExpenseClaimInputSchema.parse(body));
  }

  @Delete("claims/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeClaim(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<void> {
    return this.expenses.removeClaim(user, meta, code);
  }

  @Get("categories")
  listCategories(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Query() query: unknown): Promise<ExpenseCategoryListResponse> {
    return this.expenses.listCategories(user, meta, expenseCategoryListQuerySchema.parse(query));
  }

  @Post("categories")
  @HttpCode(HttpStatus.CREATED)
  createCategory(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Body() body: unknown): Promise<ExpenseCategoryRecord> {
    return this.expenses.createCategory(user, meta, createExpenseCategoryInputSchema.parse(body));
  }

  @Patch("categories/:code/status")
  changeCategoryStatus(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string, @Body() body: unknown): Promise<ExpenseCategoryRecord> {
    return this.expenses.changeCategoryStatus(user, meta, code, changeCategoryStatusInputSchema.parse(body));
  }

  @Patch("categories/:code")
  updateCategory(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string, @Body() body: unknown): Promise<ExpenseCategoryRecord> {
    return this.expenses.updateCategory(user, meta, code, updateExpenseCategoryInputSchema.parse(body));
  }

  @Delete("categories/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<void> {
    return this.expenses.removeCategory(user, meta, code);
  }

  @Get()
  list(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Query() query: unknown,
  ): Promise<ExpenseListResponse> {
    return this.expenses.list(user, meta, expenseListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<Expense> {
    return this.expenses.detail(user, meta, code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Body() body: unknown): Promise<Expense> {
    return this.expenses.create(user, meta, createExpenseInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Expense> {
    return this.expenses.changeStatus(user, meta, code, changeExpenseStatusInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Expense> {
    return this.expenses.update(user, meta, code, updateExpenseInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<void> {
    return this.expenses.remove(user, meta, code);
  }
}
