"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { PAYMENT_METHODS, createPaymentInputSchema, type CreatePaymentInput, type Payment } from "@amni/shared";
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
import { AmniApiError } from "@/src/lib/client";
import { paymentsClient } from "@/src/lib/payments";

const CURRENCIES = ["USD", "GBP", "EUR"];

const DEFAULT_VALUES: CreatePaymentInput = {
  type: "incoming",
  party: "",
  amount: 0,
  currency: "USD",
  method: "bank_transfer",
};

interface NewPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payment: Payment) => void;
}

export function NewPaymentDialog({ open, onOpenChange, onCreate }: NewPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchType = watch("type");
  const watchCurrency = watch("currency");
  const watchMethod = watch("method");

  function onSubmit(data: CreatePaymentInput) {
    setError("root", { type: "manual", message: "" });
    paymentsClient
      .create(data)
      .then((payment) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(payment);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreatePaymentInput;
            if (path in createPaymentInputSchema.shape) {
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
          New payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New payment</DialogTitle>
          <DialogDescription>Record money received or paid out.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payment-type">Type</Label>
              <Select
                value={watchType}
                onValueChange={(value) => setValue("type", value as CreatePaymentInput["type"])}
              >
                <SelectTrigger id="payment-type" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                </SelectContent>
              </Select>
              {errors.type ? (
                <p id="payment-type-error" className="text-xs text-destructive" role="alert">
                  {errors.type.message}
                </p>
              ) : null}
            </div>
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-party">Party</Label>
            <Input
              id="payment-party"
              placeholder="Customer or supplier"
              aria-invalid={Boolean(errors.party)}
              aria-describedby={errors.party ? "payment-party-error" : undefined}
              {...register("party")}
            />
            {errors.party ? (
              <p id="payment-party-error" className="text-xs text-destructive" role="alert">
                {errors.party.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label htmlFor="payment-invoice">Invoice</Label>
              <Input
                id="payment-invoice"
                placeholder="INV-2043"
                aria-invalid={Boolean(errors.invoiceCode)}
                aria-describedby={errors.invoiceCode ? "payment-invoice-error" : undefined}
                {...register("invoiceCode")}
              />
              {errors.invoiceCode ? (
                <p id="payment-invoice-error" className="text-xs text-destructive" role="alert">
                  {errors.invoiceCode.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
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
              <Label htmlFor="payment-currency">Currency</Label>
              <Select
                value={watchCurrency}
                onValueChange={(value) => setValue("currency", value as CreatePaymentInput["currency"])}
              >
                <SelectTrigger id="payment-currency" aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-method">Method</Label>
              <Select
                value={watchMethod}
                onValueChange={(value) => setValue("method", value as CreatePaymentInput["method"])}
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
              {errors.method ? (
                <p id="payment-method-error" className="text-xs text-destructive" role="alert">
                  {errors.method.message}
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
                "Create payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
