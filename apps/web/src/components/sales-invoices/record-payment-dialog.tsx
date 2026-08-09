"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CreditCard, Loader2 } from "lucide-react";
import {
  recordPaymentInputSchema,
  type RecordPaymentInput,
  type SalesInvoice,
} from "@amni/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { salesInvoicesClient, SalesInvoicesApiError } from "@/src/lib/sales-invoices";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SalesInvoice | null;
  onRecorded: (invoice: SalesInvoice) => void;
}

export function RecordPaymentDialog({ open, onOpenChange, invoice, onRecorded }: RecordPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentInputSchema),
    defaultValues: { amount: 0, method: "bank_transfer" },
  });

  const watchMethod = watch("method");

  useEffect(() => {
    if (!open || !invoice) return;
    reset({
      amount: invoice.summary.total - invoice.amountPaid,
      method: "bank_transfer",
      date: undefined,
      reference: undefined,
    });
    setError("root", { type: "manual", message: "" });
  }, [open, invoice, reset, setError]);

  if (!invoice) return null;

  const target = invoice;
  const remaining = invoice.summary.total - invoice.amountPaid;

  function onSubmit(data: RecordPaymentInput) {
    if (data.amount > remaining) {
      setError("amount", { type: "manual", message: "Amount exceeds the remaining balance" });
      return;
    }
    setError("root", { type: "manual", message: "" });
    salesInvoicesClient
      .recordPayment(target.code, data)
      .then((updated) => {
        onOpenChange(false);
        onRecorded(updated);
      })
      .catch((error: unknown) => {
        if (error instanceof SalesInvoicesApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            if (field in recordPaymentInputSchema.shape) {
              setError(field as keyof RecordPaymentInput, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message: error instanceof SalesInvoicesApiError ? error.message : "Something went wrong. Please try again.",
        });
      });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError("root", { type: "manual", message: "" });
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Record payment
          </DialogTitle>
          <DialogDescription>
            Record a payment against {invoice.code} for {invoice.customer.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Remaining balance</span>
          <span className="font-semibold tabular-nums">{formatCurrency(remaining, invoice.currency)}</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0.01"
              step="0.01"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "payment-amount-error" : undefined}
              {...register("amount")}
            />
            {errors.amount ? (
              <p id="payment-amount-error" className="text-xs text-destructive" role="alert">
                {errors.amount.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-method">Method</Label>
            <Select
              value={watchMethod}
              onValueChange={(value) => setValue("method", value as RecordPaymentInput["method"])}
            >
              <SelectTrigger id="payment-method" aria-label="Method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">Date</Label>
              <Input
                id="payment-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "payment-date-error" : undefined}
                {...register("date", { setValueAs: (value) => (value ? new Date(value).toISOString() : undefined) })}
              />
              {errors.date ? (
                <p id="payment-date-error" className="text-xs text-destructive" role="alert">
                  {errors.date.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                placeholder="TXN-1029"
                aria-invalid={Boolean(errors.reference)}
                aria-describedby={errors.reference ? "payment-reference-error" : undefined}
                {...register("reference")}
              />
              {errors.reference ? (
                <p id="payment-reference-error" className="text-xs text-destructive" role="alert">
                  {errors.reference.message}
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
                  Recording…
                </>
              ) : (
                "Record payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
