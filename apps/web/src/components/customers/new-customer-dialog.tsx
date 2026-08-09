"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createCustomerInputSchema,
  type CreateCustomerInput,
  type Customer,
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
import { customersClient } from "@/src/lib/customers";

const CURRENCIES = ["USD", "GBP", "EUR"];

const CUSTOMER_TYPES = ["company", "individual"] as const;

const CUSTOMER_TYPE_LABELS: Record<Customer["type"], string> = {
  company: "Company",
  individual: "Individual",
};

const DEFAULT_VALUES: CreateCustomerInput = {
  name: "",
  type: "company",
  group: "",
  territory: undefined,
  email: undefined,
  phone: undefined,
  currency: "USD",
  paymentTerms: undefined,
};

interface NewCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (customer: Customer) => void;
}

export function NewCustomerDialog({ open, onOpenChange, onCreate }: NewCustomerDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchCurrency = watch("currency");
  const watchType = watch("type");

  function onSubmit(data: CreateCustomerInput) {
    setError("root", { type: "manual", message: "" });
    customersClient
      .create(data)
      .then((customer) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(customer);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateCustomerInput;
            if (path in createCustomerInputSchema.shape) {
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
          New customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>Add a customer you sell goods or services to.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "customer-name-error" : undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p id="customer-name-error" className="text-xs text-destructive" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-type">Type</Label>
              <Select
                value={watchType}
                onValueChange={(value) => setValue("type", value as Customer["type"])}
              >
                <SelectTrigger id="customer-type" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CUSTOMER_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-group">Group</Label>
              <Input
                id="customer-group"
                aria-invalid={Boolean(errors.group)}
                aria-describedby={errors.group ? "customer-group-error" : undefined}
                {...register("group")}
              />
              {errors.group ? (
                <p id="customer-group-error" className="text-xs text-destructive" role="alert">
                  {errors.group.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-territory">Territory</Label>
              <Input
                id="customer-territory"
                aria-invalid={Boolean(errors.territory)}
                aria-describedby={errors.territory ? "customer-territory-error" : undefined}
                {...register("territory")}
              />
              {errors.territory ? (
                <p id="customer-territory-error" className="text-xs text-destructive" role="alert">
                  {errors.territory.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "customer-email-error" : undefined}
                {...register("email")}
              />
              {errors.email ? (
                <p id="customer-email-error" className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "customer-phone-error" : undefined}
                {...register("phone")}
              />
              {errors.phone ? (
                <p id="customer-phone-error" className="text-xs text-destructive" role="alert">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-currency">Currency</Label>
              <Select
                value={watchCurrency}
                onValueChange={(value) => setValue("currency", value as CreateCustomerInput["currency"])}
              >
                <SelectTrigger id="customer-currency" aria-label="Currency">
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
              <Label htmlFor="customer-terms">Payment terms</Label>
              <Input
                id="customer-terms"
                placeholder="Net 30"
                aria-invalid={Boolean(errors.paymentTerms)}
                aria-describedby={errors.paymentTerms ? "customer-terms-error" : undefined}
                {...register("paymentTerms")}
              />
              {errors.paymentTerms ? (
                <p id="customer-terms-error" className="text-xs text-destructive" role="alert">
                  {errors.paymentTerms.message}
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
                "Create customer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
