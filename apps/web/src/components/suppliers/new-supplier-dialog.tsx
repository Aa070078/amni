"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createSupplierInputSchema,
  type CreateSupplierInput,
  type Supplier,
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
import { AmniApiError } from "@/src/lib/client";
import { suppliersClient } from "@/src/lib/suppliers";

const CURRENCIES = ["USD", "GBP", "EUR"];

const DEFAULT_VALUES: CreateSupplierInput = {
  name: "",
  group: "",
  email: undefined,
  phone: undefined,
  currency: "USD",
  paymentTerms: undefined,
  taxId: undefined,
};

interface NewSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (supplier: Supplier) => void;
}

export function NewSupplierDialog({ open, onOpenChange, onCreate }: NewSupplierDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchCurrency = watch("currency");

  function onSubmit(data: CreateSupplierInput) {
    setError("root", { type: "manual", message: "" });
    suppliersClient
      .create(data)
      .then((supplier) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(supplier);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateSupplierInput;
            if (path in createSupplierInputSchema.shape) {
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
          New supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New supplier</DialogTitle>
          <DialogDescription>
            Add a supplier you buy goods or services from.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supplier-name">Name</Label>
              <Input
                id="supplier-name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "supplier-name-error" : undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p id="supplier-name-error" className="text-xs text-destructive" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplier-group">Group</Label>
              <Input
                id="supplier-group"
                aria-invalid={Boolean(errors.group)}
                aria-describedby={errors.group ? "supplier-group-error" : undefined}
                {...register("group")}
              />
              {errors.group ? (
                <p id="supplier-group-error" className="text-xs text-destructive" role="alert">
                  {errors.group.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supplier-email">Email</Label>
              <Input
                id="supplier-email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "supplier-email-error" : undefined}
                {...register("email")}
              />
              {errors.email ? (
                <p id="supplier-email-error" className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplier-phone">Phone</Label>
              <Input
                id="supplier-phone"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "supplier-phone-error" : undefined}
                {...register("phone")}
              />
              {errors.phone ? (
                <p id="supplier-phone-error" className="text-xs text-destructive" role="alert">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supplier-currency">Currency</Label>
              <Select
                value={watchCurrency}
                onValueChange={(value) => setValue("currency", value as CreateSupplierInput["currency"])}
              >
                <SelectTrigger id="supplier-currency" aria-label="Currency">
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
              <Label htmlFor="supplier-terms">Payment terms</Label>
              <Input
                id="supplier-terms"
                placeholder="Net 30"
                aria-invalid={Boolean(errors.paymentTerms)}
                aria-describedby={errors.paymentTerms ? "supplier-terms-error" : undefined}
                {...register("paymentTerms")}
              />
              {errors.paymentTerms ? (
                <p id="supplier-terms-error" className="text-xs text-destructive" role="alert">
                  {errors.paymentTerms.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplier-tax">Tax ID</Label>
            <Input
              id="supplier-tax"
              aria-invalid={Boolean(errors.taxId)}
              aria-describedby={errors.taxId ? "supplier-tax-error" : undefined}
              {...register("taxId")}
            />
            {errors.taxId ? (
              <p id="supplier-tax-error" className="text-xs text-destructive" role="alert">
                {errors.taxId.message}
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
                "Create supplier"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
