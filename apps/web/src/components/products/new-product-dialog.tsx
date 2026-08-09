"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createProductInputSchema,
  PRODUCT_STATUSES,
  type CreateProductInput,
  type Product,
} from "@amni/shared";
import {
  Button,
  Checkbox,
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
import { productsClient, ProductsApiError } from "@/src/lib/products";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "./product-status";

const CURRENCIES = ["USD", "GBP", "EUR"];

interface NewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (product: Product) => void;
}

const DEFAULT_VALUES: CreateProductInput = {
  name: "",
  sku: "",
  category: "",
  unit: "pcs",
  currency: "USD",
  price: 0,
  status: "draft",
  cost: 0,
  reorderLevel: 0,
  vatRate: 0,
  isStockItem: true,
  isSalesItem: true,
  isPurchaseItem: false,
};

export function NewProductDialog({ open, onOpenChange, onCreate }: NewProductDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchCategory = watch("category");
  const watchUnit = watch("unit");
  const watchCurrency = watch("currency");
  const watchStatus = watch("status");
  const watchIsStockItem = watch("isStockItem");
  const watchIsSalesItem = watch("isSalesItem");
  const watchIsPurchaseItem = watch("isPurchaseItem");

  function onSubmit(data: CreateProductInput) {
    setError("root", { type: "manual", message: "" });
    productsClient
      .create(data)
      .then((product) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(product);
      })
      .catch((error: unknown) => {
        if (error instanceof ProductsApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateProductInput;
            if (path in createProductInputSchema.shape) {
              setError(path, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message: error instanceof ProductsApiError ? error.message : "Something went wrong. Please try again.",
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
          New product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>
            Add an item to your catalog. You can edit its details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-sku">SKU</Label>
              <Input
                id="product-sku"
                placeholder="SKU-001"
                aria-invalid={Boolean(errors.sku)}
                aria-describedby={errors.sku ? "product-sku-error" : undefined}
                {...register("sku")}
              />
              {errors.sku ? (
                <p id="product-sku-error" className="text-xs text-destructive" role="alert">
                  {errors.sku.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                placeholder="Nimbus LED Panel"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "product-name-error" : undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p id="product-name-error" className="text-xs text-destructive" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-category">Category</Label>
              <Select
                value={watchCategory}
                onValueChange={(value) => setValue("category", value as CreateProductInput["category"])}
              >
                <SelectTrigger
                  id="product-category"
                  aria-label="Category"
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={errors.category ? "product-category-error" : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value[0]?.toUpperCase()}
                      {value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category ? (
                <p id="product-category-error" className="text-xs text-destructive" role="alert">
                  {errors.category.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-unit">Unit</Label>
              <Select value={watchUnit} onValueChange={(value) => setValue("unit", value as CreateProductInput["unit"])}>
                <SelectTrigger id="product-unit" aria-label="Unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Price</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="100.00"
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? "product-price-error" : undefined}
                {...register("price")}
              />
              {errors.price ? (
                <p id="product-price-error" className="text-xs text-destructive" role="alert">
                  {errors.price.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-cost">Cost</Label>
              <Input
                id="product-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="60.00"
                aria-invalid={Boolean(errors.cost)}
                aria-describedby={errors.cost ? "product-cost-error" : undefined}
                {...register("cost")}
              />
              {errors.cost ? (
                <p id="product-cost-error" className="text-xs text-destructive" role="alert">
                  {errors.cost.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-reorder">Reorder level</Label>
              <Input
                id="product-reorder"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                aria-invalid={Boolean(errors.reorderLevel)}
                aria-describedby={errors.reorderLevel ? "product-reorder-error" : undefined}
                {...register("reorderLevel")}
              />
              {errors.reorderLevel ? (
                <p id="product-reorder-error" className="text-xs text-destructive" role="alert">
                  {errors.reorderLevel.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-vat">VAT rate (%)</Label>
              <Input
                id="product-vat"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="20"
                aria-invalid={Boolean(errors.vatRate)}
                aria-describedby={errors.vatRate ? "product-vat-error" : undefined}
                {...register("vatRate")}
              />
              {errors.vatRate ? (
                <p id="product-vat-error" className="text-xs text-destructive" role="alert">
                  {errors.vatRate.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-currency">Currency</Label>
              <Select
                value={watchCurrency}
                onValueChange={(value) => setValue("currency", value as CreateProductInput["currency"])}
              >
                <SelectTrigger id="product-currency" aria-label="Currency">
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
              <Label htmlFor="product-status">Status</Label>
              <Select
                value={watchStatus}
                onValueChange={(value) => setValue("status", value as CreateProductInput["status"])}
              >
                <SelectTrigger id="product-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUSES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Usage</legend>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="product-stock-item"
                  checked={watchIsStockItem}
                  onCheckedChange={(checked) => setValue("isStockItem", checked === true)}
                />
                <Label htmlFor="product-stock-item">Stock item</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="product-sales-item"
                  checked={watchIsSalesItem}
                  onCheckedChange={(checked) => setValue("isSalesItem", checked === true)}
                />
                <Label htmlFor="product-sales-item">Sales item</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="product-purchase-item"
                  checked={watchIsPurchaseItem}
                  onCheckedChange={(checked) => setValue("isPurchaseItem", checked === true)}
                />
                <Label htmlFor="product-purchase-item">Purchase item</Label>
              </div>
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="product-description">Description</Label>
            <textarea
              id="product-description"
              rows={3}
              placeholder="What is this product?"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "product-description-error" : undefined}
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.description && "border-destructive",
              )}
              {...register("description")}
            />
            {errors.description ? (
              <p id="product-description-error" className="text-xs text-destructive" role="alert">
                {errors.description.message}
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
                "Create product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
