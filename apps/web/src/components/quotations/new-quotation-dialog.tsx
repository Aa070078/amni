"use client";

import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  createQuotationInputSchema,
  type CreateQuotationInput,
  type Quotation,
} from "@amni/shared";
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
import { formatCurrency } from "@/src/lib/format";
import { quotationsClient, QuotationsApiError } from "@/src/lib/quotations";

const CURRENCIES = ["USD", "GBP", "EUR"];
const TAX_RATE = 0.1;

const toIsoDateTime = (value: unknown): unknown => {
  if (value === "" || value == null) return undefined;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`).toISOString();
  }
  return value;
};

const quotationFormSchema = createQuotationInputSchema
  .omit({ date: true, validUntil: true })
  .extend({
    date: z.preprocess(toIsoDateTime, createQuotationInputSchema.shape.date),
    validUntil: z.preprocess(toIsoDateTime, createQuotationInputSchema.shape.validUntil),
  });

const round2 = (value: number): number => Math.round(value * 100) / 100;

const DEFAULT_VALUES: CreateQuotationInput = {
  customerCode: "",
  date: "",
  validUntil: "",
  currency: "USD",
  notes: "",
  items: [{ product: "", name: "", uom: "pcs", qty: 1, rate: 0 }],
};

interface NewQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (quotation: Quotation) => void;
}

export function NewQuotationDialog({ open, onOpenChange, onCreate }: NewQuotationDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuotationInput>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const optionsQuery = useQuery({
    queryKey: ["quotations", "options"],
    queryFn: quotationsClient.options,
    enabled: open,
    placeholderData: (previous) => previous,
  });

  const watchCustomer = watch("customerCode");
  const watchCurrency = watch("currency");
  const watchedItems = watch("items") ?? [];

  const preview = watchedItems.reduce(
    (acc, item) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      return { subtotal: acc.subtotal + qty * rate };
    },
    { subtotal: 0 },
  );
  preview.subtotal = round2(preview.subtotal);
  const tax = round2(preview.subtotal * TAX_RATE);
  const total = round2(preview.subtotal + tax);

  function handleProductChange(index: number, code: string) {
    const product = optionsQuery.data?.products.find((entry) => entry.code === code);
    setValue(`items.${index}.product`, code);
    setValue(`items.${index}.name`, product?.name ?? "");
    setValue(`items.${index}.rate`, product?.rate ?? 0);
  }

  function onSubmit(data: CreateQuotationInput) {
    setError("root", { type: "manual", message: "" });
    quotationsClient
      .create(data)
      .then((quotation) => {
        reset(DEFAULT_VALUES);
        setError("root", { type: "manual", message: "" });
        onOpenChange(false);
        onCreate(quotation);
      })
      .catch((error: unknown) => {
        if (error instanceof QuotationsApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateQuotationInput;
            if (path in createQuotationInputSchema.shape) {
              setError(path, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message: error instanceof QuotationsApiError ? error.message : "Something went wrong. Please try again.",
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
          New quotation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New quotation</DialogTitle>
          <DialogDescription>
            Quote a customer with line items. Totals are computed automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quotation-customer">Customer</Label>
              <Select
                value={watchCustomer || undefined}
                onValueChange={(value) => setValue("customerCode", value)}
              >
                <SelectTrigger id="quotation-customer" aria-label="Customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {optionsQuery.data?.customers.map((customer) => (
                    <SelectItem key={customer.code} value={customer.code}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerCode ? (
                <p id="quotation-customer-error" className="text-xs text-destructive" role="alert">
                  {errors.customerCode.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quotation-currency">Currency</Label>
              <Select
                value={watchCurrency}
                onValueChange={(value) => setValue("currency", value as CreateQuotationInput["currency"])}
              >
                <SelectTrigger id="quotation-currency" aria-label="Currency">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quotation-date">Date</Label>
              <Input
                id="quotation-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "quotation-date-error" : undefined}
                {...register("date")}
              />
              {errors.date ? (
                <p id="quotation-date-error" className="text-xs text-destructive" role="alert">
                  {errors.date.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quotation-valid-until">Valid until</Label>
              <Input
                id="quotation-valid-until"
                type="date"
                aria-invalid={Boolean(errors.validUntil)}
                aria-describedby={errors.validUntil ? "quotation-valid-until-error" : undefined}
                {...register("validUntil")}
              />
              {errors.validUntil ? (
                <p id="quotation-valid-until-error" className="text-xs text-destructive" role="alert">
                  {errors.validUntil.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ product: "", name: "", uom: "pcs", qty: 1, rate: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add line
              </Button>
            </div>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_auto] sm:items-end"
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`quotation-item-${index}-product`}>Product</Label>
                  <Select
                    value={field.product || undefined}
                    onValueChange={(value) => handleProductChange(index, value)}
                  >
                    <SelectTrigger id={`quotation-item-${index}-product`} aria-label={`Product line ${index + 1}`}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsQuery.data?.products.map((product) => (
                        <SelectItem key={product.code} value={product.code}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.items?.[index]?.product?.message ? (
                    <p id={`quotation-item-${index}-product-error`} className="text-xs text-destructive" role="alert">
                      {errors.items?.[index]?.product?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`quotation-item-${index}-qty`}>Qty</Label>
                  <Input
                    id={`quotation-item-${index}-qty`}
                    type="number"
                    min="0"
                    step="any"
                    aria-invalid={Boolean(errors.items?.[index]?.qty)}
                    aria-describedby={errors.items?.[index]?.qty ? `quotation-item-${index}-qty-error` : undefined}
                    {...register(`items.${index}.qty`)}
                  />
                  {errors.items?.[index]?.qty?.message ? (
                    <p id={`quotation-item-${index}-qty-error`} className="text-xs text-destructive" role="alert">
                      {errors.items?.[index]?.qty?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`quotation-item-${index}-rate`}>Rate</Label>
                  <Input
                    id={`quotation-item-${index}-rate`}
                    type="number"
                    min="0"
                    step="any"
                    aria-invalid={Boolean(errors.items?.[index]?.rate)}
                    aria-describedby={errors.items?.[index]?.rate ? `quotation-item-${index}-rate-error` : undefined}
                    {...register(`items.${index}.rate`)}
                  />
                  {errors.items?.[index]?.rate?.message ? (
                    <p id={`quotation-item-${index}-rate-error`} className="text-xs text-destructive" role="alert">
                      {errors.items?.[index]?.rate?.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex sm:items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
            {errors.items?.root?.message ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.items.root.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums text-foreground">{formatCurrency(preview.subtotal, watchCurrency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax (10%)</span>
              <span className="tabular-nums text-foreground">{formatCurrency(tax, watchCurrency)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t pt-1 text-sm font-semibold">
              <span className="text-foreground">Total</span>
              <span className="tabular-nums text-foreground">{formatCurrency(total, watchCurrency)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quotation-notes">Notes</Label>
            <textarea
              id="quotation-notes"
              rows={3}
              placeholder="Terms, lead times…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "quotation-notes-error" : undefined}
              className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register("notes")}
            />
            {errors.notes ? (
              <p id="quotation-notes-error" className="text-xs text-destructive" role="alert">
                {errors.notes.message}
              </p>
            ) : null}
          </div>

          {optionsQuery.isError ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Couldn&apos;t load customers and products. Please try again.
            </p>
          ) : null}

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
                "Create quotation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
