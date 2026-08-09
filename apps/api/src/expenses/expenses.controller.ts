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
  createExpenseInputSchema,
  expenseListQuerySchema,
  expenseStatusSchema,
  updateExpenseInputSchema,
  type Expense,
  type ExpenseListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ExpensesService } from "./expenses.service";

const changeExpenseStatusInputSchema = z.object({ status: expenseStatusSchema });

@Controller("finance/expenses")
@UseGuards(AuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

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
