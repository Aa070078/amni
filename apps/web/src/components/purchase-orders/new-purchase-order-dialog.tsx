"use client";

import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createPurchaseOrderInputSchema,
  type CreatePurchaseOrderInput,
  type PurchaseOrder,
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
import { cn } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { purchaseOrdersClient } from "@/src/lib/purchase-orders";

const CURRENCIES = ["USD", "GBP", "EUR"];

const DEFAULT_VALUES: CreatePurchaseOrderInput = {
  supplierCode: "",
  currency: "USD",
  items: [{ product: "", name: undefined, uom: "pcs", qty: 1, rate: 0 }],
};

interface NewPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (order: PurchaseOrder) => void;
}

export function NewPurchaseOrderDialog({ open, onOpenChange, onCreate }: NewPurchaseOrderDialogProps) {
  const optionsQuery = useQuery({
    queryKey: ["purchase-orders", "options"],
    queryFn: () => purchaseOrdersClient.options(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(createPurchaseOrderInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchSupplier = watch("supplierCode");
  const watchCurrency = watch("currency");
  const watchItems = watch("items");

  const subtotal = (watchItems ?? []).reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0,
  );

  const suppliers = optionsQuery.data?.suppliers ?? [];
  const products = optionsQuery.data?.products ?? [];

  function handleProductChange(index: number, code: string) {
    setValue(`items.${index}.product` as const, code);
    const product = products.find((entry) => entry.code === code);
    if (product) {
      setValue(`items.${index}.name` as const, product.name);
      setValue(`items.${index}.rate` as const, product.rate);
    }
  }

  function onSubmit(data: CreatePurchaseOrderInput) {
    setError("root", { type: "manual", message: "" });
    purchaseOrdersClient
      .create(data)
      .then((order) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(order);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreatePurchaseOrderInput;
            if (path in createPurchaseOrderInputSchema.shape) {
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
          New purchase order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
          <DialogDescription>
            Raise an order with a supplier. Add at least one line item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="po-supplier">Supplier</Label>
            <Select
              value={watchSupplier || undefined}
              onValueChange={(value) => setValue("supplierCode", value)}
              disabled={optionsQuery.isLoading}
            >
              <SelectTrigger id="po-supplier" aria-label="Supplier">
                <SelectValue placeholder={optionsQuery.isLoading ? "Loading suppliers…" : "Select supplier"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.code} value={supplier.code}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplierCode ? (
              <p id="po-supplier-error" className="text-xs text-destructive" role="alert">
                {errors.supplierCode.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="po-date">Order date</Label>
              <Input
                id="po-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "po-date-error" : undefined}
                {...register("date", { setValueAs: (value) => (value ? new Date(value).toISOString() : undefined) })}
              />
              {errors.date ? (
                <p id="po-date-error" className="text-xs text-destructive" role="alert">
                  {errors.date.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-expected">Expected date</Label>
              <Input
                id="po-expected"
                type="date"
                aria-invalid={Boolean(errors.expectedDate)}
                aria-describedby={errors.expectedDate ? "po-expected-error" : undefined}
                {...register("expectedDate", {
                  setValueAs: (value) => (value ? new Date(value).toISOString() : value),
                })}
              />
              {errors.expectedDate ? (
                <p id="po-expected-error" className="text-xs text-destructive" role="alert">
                  {errors.expectedDate.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po-currency">Currency</Label>
            <Select
              value={watchCurrency}
              onValueChange={(value) => setValue("currency", value as CreatePurchaseOrderInput["currency"])}
            >
              <SelectTrigger id="po-currency" aria-label="Currency">
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

          <div className="space-y-2">
            <span className="text-sm font-medium">Line items</span>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`po-item-${index}-product`}>Product</Label>
                  <Controller
                    control={control}
                    name={`items.${index}.product` as const}
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => handleProductChange(index, value)}
                        disabled={optionsQuery.isLoading}
                      >
                        <SelectTrigger id={`po-item-${index}-product`} aria-label="Product">
                          <SelectValue placeholder={optionsQuery.isLoading ? "Loading products…" : "Select product"} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.code} value={product.code}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.items?.[index]?.product ? (
                    <p id={`po-item-${index}-product-error`} className="text-xs text-destructive" role="alert">
                      {errors.items[index].product.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`po-item-${index}-qty`}>Qty</Label>
                    <Input
                      id={`po-item-${index}-qty`}
                      type="number"
                      min="1"
                      step="1"
                      aria-invalid={Boolean(errors.items?.[index]?.qty)}
                      aria-describedby={
                        errors.items?.[index]?.qty ? `po-item-${index}-qty-error` : undefined
                      }
                      {...register(`items.${index}.qty` as const)}
                    />
                    {errors.items?.[index]?.qty ? (
                      <p id={`po-item-${index}-qty-error`} className="text-xs text-destructive" role="alert">
                        {errors.items[index].qty.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`po-item-${index}-rate`}>Rate</Label>
                    <Controller
                      control={control}
                      name={`items.${index}.rate` as const}
                      render={({ field }) => (
                        <Input
                          id={`po-item-${index}-rate`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value}
                          onChange={field.onChange}
                          aria-invalid={Boolean(errors.items?.[index]?.rate)}
                          aria-describedby={
                            errors.items?.[index]?.rate ? `po-item-${index}-rate-error` : undefined
                          }
                        />
                      )}
                    />
                    {errors.items?.[index]?.rate ? (
                      <p id={`po-item-${index}-rate-error`} className="text-xs text-destructive" role="alert">
                        {errors.items[index].rate.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ product: "", name: undefined, uom: "pcs", qty: 1, rate: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add line item
            </Button>
            {errors.items?.root?.message ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.items.root.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal, watchCurrency)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(subtotal, watchCurrency)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po-notes">Notes</Label>
            <textarea
              id="po-notes"
              rows={3}
              placeholder="Delivery instructions, payment terms…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "po-notes-error" : undefined}
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.notes && "border-destructive",
              )}
              {...register("notes")}
            />
            {errors.notes ? (
              <p id="po-notes-error" className="text-xs text-destructive" role="alert">
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
                "Create purchase order"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
