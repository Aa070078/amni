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
  overview(): ExpensesOverview {
    return this.expenses.overview();
  }

  @Get("claims")
  listClaims(@Query() query: unknown): ExpenseClaimListResponse {
    return this.expenses.listClaims(expenseClaimListQuerySchema.parse(query));
  }

  @Get("claims/:code")
  claimDetail(@Param("code") code: string): ExpenseClaim {
    return this.expenses.detailClaim(code);
  }

  @Post("claims")
  @HttpCode(HttpStatus.CREATED)
  createClaim(@Body() body: unknown): ExpenseClaim {
    return this.expenses.createClaim(createExpenseClaimInputSchema.parse(body));
  }

  @Patch("claims/:code/status")
  changeClaimStatus(@Param("code") code: string, @Body() body: unknown): ExpenseClaim {
    return this.expenses.changeClaimStatus(code, changeClaimStatusInputSchema.parse(body));
  }

  @Patch("claims/:code")
  updateClaim(@Param("code") code: string, @Body() body: unknown): ExpenseClaim {
    return this.expenses.updateClaim(code, updateExpenseClaimInputSchema.parse(body));
  }

  @Delete("claims/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeClaim(@Param("code") code: string): void {
    this.expenses.removeClaim(code);
  }

  @Get("categories")
  listCategories(@Query() query: unknown): ExpenseCategoryListResponse {
    return this.expenses.listCategories(expenseCategoryListQuerySchema.parse(query));
  }

  @Post("categories")
  @HttpCode(HttpStatus.CREATED)
  createCategory(@Body() body: unknown): ExpenseCategoryRecord {
    return this.expenses.createCategory(createExpenseCategoryInputSchema.parse(body));
  }

  @Patch("categories/:code/status")
  changeCategoryStatus(@Param("code") code: string, @Body() body: unknown): ExpenseCategoryRecord {
    return this.expenses.changeCategoryStatus(code, changeCategoryStatusInputSchema.parse(body));
  }

  @Patch("categories/:code")
  updateCategory(@Param("code") code: string, @Body() body: unknown): ExpenseCategoryRecord {
    return this.expenses.updateCategory(code, updateExpenseCategoryInputSchema.parse(body));
  }

  @Delete("categories/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@Param("code") code: string): void {
    this.expenses.removeCategory(code);
  }

  @Get()
  list(@Query() query: unknown): ExpenseListResponse {
    return this.expenses.list(expenseListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): Expense {
    return this.expenses.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Expense {
    return this.expenses.create(createExpenseInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(@Param("code") code: string, @Body() body: unknown): Expense {
    return this.expenses.changeStatus(code, changeExpenseStatusInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Expense {
    return this.expenses.update(code, updateExpenseInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.expenses.remove(code);
  }
}
