"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { EXPENSE_CATEGORIES, createExpenseClaimInputSchema, type CreateExpenseClaimInput, type ExpenseClaim } from "@amni/shared";
import {
  Button,
  cn,
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
import { AmniApiError } from "@/src/lib/client";
import { expensesClient } from "@/src/lib/expenses";

interface NewExpenseClaimDialogProps {
  onCreated: (claim: ExpenseClaim) => void;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_VALUES: CreateExpenseClaimInput = {
  employee: "",
  purpose: "",
  currency: "USD",
  items: [{ description: "", category: "travel", amount: 0, date: todayDate() }],
};

export function NewExpenseClaimDialog({ onCreated }: NewExpenseClaimDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseClaimInput>({
    resolver: zodResolver(createExpenseClaimInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  function onSubmit(data: CreateExpenseClaimInput) {
    setError("root", { type: "manual", message: "" });
    expensesClient
      .createClaim({
        ...data,
        items: data.items.map((item) => ({ ...item, amount: Number(item.amount) })),
      })
      .then((claim) => {
        reset(DEFAULT_VALUES);
        setOpen(false);
        onCreated(claim);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateExpenseClaimInput;
            if (path in createExpenseClaimInputSchema.shape) {
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
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New claim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New expense claim</DialogTitle>
          <DialogDescription>Submit employee expenses for reimbursement.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="claim-employee">Employee</Label>
              <Input
                id="claim-employee"
                placeholder="Jane Smith"
                aria-invalid={Boolean(errors.employee)}
                {...register("employee")}
              />
              {errors.employee ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.employee.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-department">Department</Label>
              <Input
                id="claim-department"
                placeholder="Engineering"
                aria-invalid={Boolean(errors.department)}
                {...register("department")}
              />
              {errors.department ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.department.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="claim-purpose">Purpose</Label>
            <Input
              id="claim-purpose"
              placeholder="Q2 team offsite travel"
              aria-invalid={Boolean(errors.purpose)}
              {...register("purpose")}
            />
            {errors.purpose ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.purpose.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Items</Label>
              <p className="text-xs text-muted-foreground">At least one expense line is required.</p>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Item {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`claim-item-description-${index}`}>Description</Label>
                  <Input
                    id={`claim-item-description-${index}`}
                    placeholder="Flights to Berlin"
                    aria-invalid={Boolean(errors.items?.[index]?.description)}
                    {...register(`items.${index}.description`)}
                  />
                  {errors.items?.[index]?.description ? (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.items[index].description.message}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`claim-item-category-${index}`}>Category</Label>
                    <Select
                      value={watch(`items.${index}.category`)}
                      onValueChange={(value) => setValue(`items.${index}.category`, value as CreateExpenseClaimInput["items"][number]["category"])}
                    >
                      <SelectTrigger id={`claim-item-category-${index}`} aria-label={`Category for item ${index + 1}`}>
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
                    {errors.items?.[index]?.category ? (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.items[index].category.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`claim-item-amount-${index}`}>Amount</Label>
                    <Input
                      id={`claim-item-amount-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      aria-invalid={Boolean(errors.items?.[index]?.amount)}
                      {...register(`items.${index}.amount`)}
                    />
                    {errors.items?.[index]?.amount ? (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.items[index].amount.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`claim-item-date-${index}`}>Date</Label>
                  <Input
                    id={`claim-item-date-${index}`}
                    type="date"
                    aria-invalid={Boolean(errors.items?.[index]?.date)}
                    {...register(`items.${index}.date`, { setValueAs: (value) => (value ? new Date(value).toISOString() : undefined) })}
                  />
                  {errors.items?.[index]?.date ? (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.items[index].date.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" disabled={fields.length >= 50} onClick={() => append({ description: "", category: "travel", amount: 0, date: todayDate() })}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add item
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="claim-notes">Notes</Label>
            <textarea
              id="claim-notes"
              rows={3}
              placeholder="Optional notes for the approver…"
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.notes && "border-destructive",
              )}
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.notes.message}
              </p>
            ) : null}
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
                "Create claim"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
