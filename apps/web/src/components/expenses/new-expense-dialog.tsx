"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { EXPENSE_CATEGORIES, createExpenseInputSchema, type CreateExpenseInput, type Expense } from "@amni/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amni/ui";
import { cn } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { expensesClient } from "@/src/lib/expenses";

const DEFAULT_VALUES: CreateExpenseInput = {
  category: "travel",
  description: "",
  amount: 0,
  vat: 0,
  status: "draft",
  currency: "USD",
};

interface NewExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (expense: Expense) => void;
}

export function NewExpenseDialog({ open, onOpenChange, onCreate }: NewExpenseDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchCategory = watch("category");

  function onSubmit(data: CreateExpenseInput) {
    setError("root", { type: "manual", message: "" });
    expensesClient
      .create(data)
      .then((expense) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(expense);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateExpenseInput;
            if (path in createExpenseInputSchema.shape) {
              setError(path, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message: error instanceof AmniApiError ? error.message : "Something went wrong. Please try again.",
        });
      });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset(DEFAULT_VALUES);
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New expense</DialogTitle>
          <DialogDescription>Record a cost so it can be approved and reimbursed.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-category">Category</Label>
              <Select
                value={watchCategory}
                onValueChange={(value) => setValue("category", value as CreateExpenseInput["category"])}
              >
                <SelectTrigger id="expense-category" aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category ? (
                <p id="expense-category-error" className="text-xs text-destructive" role="alert">
                  {errors.category.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "expense-date-error" : undefined}
                {...register("date", { setValueAs: (value) => (value ? new Date(value).toISOString() : undefined) })}
              />
              {errors.date ? (
                <p id="expense-date-error" className="text-xs text-destructive" role="alert">
                  {errors.date.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-description">Description</Label>
            <textarea
              id="expense-description"
              rows={3}
              placeholder="What was this for?"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "expense-description-error" : undefined}
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.description && "border-destructive",
              )}
              {...register("description")}
            />
            {errors.description ? (
              <p id="expense-description-error" className="text-xs text-destructive" role="alert">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-supplier">Supplier</Label>
              <Input
                id="expense-supplier"
                placeholder="Acme Inc."
                aria-invalid={Boolean(errors.supplier)}
                aria-describedby={errors.supplier ? "expense-supplier-error" : undefined}
                {...register("supplier")}
              />
              {errors.supplier ? (
                <p id="expense-supplier-error" className="text-xs text-destructive" role="alert">
                  {errors.supplier.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-claimedBy">Claimed by</Label>
              <Input
                id="expense-claimedBy"
                placeholder="Team member"
                aria-invalid={Boolean(errors.claimedBy)}
                aria-describedby={errors.claimedBy ? "expense-claimedBy-error" : undefined}
                {...register("claimedBy")}
              />
              {errors.claimedBy ? (
                <p id="expense-claimedBy-error" className="text-xs text-destructive" role="alert">
                  {errors.claimedBy.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? "expense-amount-error" : undefined}
                {...register("amount")}
              />
              {errors.amount ? (
                <p id="expense-amount-error" className="text-xs text-destructive" role="alert">
                  {errors.amount.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-vat">VAT</Label>
              <Input
                id="expense-vat"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.vat)}
                aria-describedby={errors.vat ? "expense-vat-error" : undefined}
                {...register("vat")}
              />
              {errors.vat ? (
                <p id="expense-vat-error" className="text-xs text-destructive" role="alert">
                  {errors.vat.message}
                </p>
              ) : null}
            </div>
          </div>

          {errors.root?.message ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                "Create expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
