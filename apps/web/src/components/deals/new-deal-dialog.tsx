"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createDealInputSchema,
  DEAL_SOURCES,
  DEAL_STAGES,
  type CreateDealInput,
  type Deal,
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
import { dealsClient, DealsApiError } from "@/src/lib/deals";

const CURRENCIES = ["USD", "GBP", "EUR"];

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (deal: Deal) => void;
}

export function NewDealDialog({ open, onOpenChange, onCreate }: NewDealDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateDealInput>({
    resolver: zodResolver(createDealInputSchema),
    defaultValues: { source: "website", stage: "qualification", currency: "USD" },
  });

  const watchSource = watch("source");
  const watchStage = watch("stage");
  const watchCurrency = watch("currency");

  function onSubmit(data: CreateDealInput) {
    setError("root", { type: "manual", message: "" });
    dealsClient
      .create(data)
      .then((deal) => {
        reset({ source: "website", stage: "qualification", currency: "USD" });
        onOpenChange(false);
        onCreate(deal);
      })
      .catch((error: unknown) => {
        if (error instanceof DealsApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateDealInput;
            if (path in createDealInputSchema.shape) {
              setError(path, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message: error instanceof DealsApiError ? error.message : "Something went wrong. Please try again.",
        });
      });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset({ source: "website", stage: "qualification", currency: "USD" });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New deal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>
            Add a qualified opportunity to your pipeline. You can move it between stages later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="deal-title">Deal title</Label>
            <Input
              id="deal-title"
              placeholder="Enterprise expansion"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "deal-title-error" : undefined}
              {...register("title")}
            />
            {errors.title ? (
              <p id="deal-title-error" className="text-xs text-destructive" role="alert">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deal-company">Company</Label>
              <Input
                id="deal-company"
                placeholder="Acme Inc."
                aria-invalid={Boolean(errors.company)}
                aria-describedby={errors.company ? "deal-company-error" : undefined}
                {...register("company")}
              />
              {errors.company ? (
                <p id="deal-company-error" className="text-xs text-destructive" role="alert">
                  {errors.company.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-contact">Contact name</Label>
              <Input
                id="deal-contact"
                placeholder="Jane Doe"
                aria-invalid={Boolean(errors.contactName)}
                aria-describedby={errors.contactName ? "deal-contact-error" : undefined}
                {...register("contactName")}
              />
              {errors.contactName ? (
                <p id="deal-contact-error" className="text-xs text-destructive" role="alert">
                  {errors.contactName.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deal-email">Contact email</Label>
              <Input
                id="deal-email"
                type="email"
                placeholder="jane@acme.com"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
                aria-describedby={errors.contactEmail ? "deal-email-error" : undefined}
                {...register("contactEmail")}
              />
              {errors.contactEmail ? (
                <p id="deal-email-error" className="text-xs text-destructive" role="alert">
                  {errors.contactEmail.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-phone">Phone</Label>
              <Input
                id="deal-phone"
                type="tel"
                placeholder="+1 555-0100"
                aria-invalid={Boolean(errors.contactPhone)}
                aria-describedby={errors.contactPhone ? "deal-phone-error" : undefined}
                {...register("contactPhone")}
              />
              {errors.contactPhone ? (
                <p id="deal-phone-error" className="text-xs text-destructive" role="alert">
                  {errors.contactPhone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deal-source">Source</Label>
              <Select value={watchSource} onValueChange={(value) => setValue("source", value as CreateDealInput["source"])}>
                <SelectTrigger id="deal-source" aria-label="Source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_SOURCES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-stage">Stage</Label>
              <Select value={watchStage} onValueChange={(value) => setValue("stage", value as CreateDealInput["stage"])}>
                <SelectTrigger id="deal-stage" aria-label="Stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Value</Label>
              <Input
                id="deal-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="10000"
                aria-invalid={Boolean(errors.value)}
                aria-describedby={errors.value ? "deal-value-error" : undefined}
                {...register("value")}
              />
              {errors.value ? (
                <p id="deal-value-error" className="text-xs text-destructive" role="alert">
                  {errors.value.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-currency">Currency</Label>
              <Select value={watchCurrency} onValueChange={(value) => setValue("currency", value as CreateDealInput["currency"])}>
                <SelectTrigger id="deal-currency" aria-label="Currency">
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
              <Label htmlFor="deal-close">Expected close</Label>
              <Input
                id="deal-close"
                type="date"
                aria-invalid={Boolean(errors.expectedClose)}
                aria-describedby={errors.expectedClose ? "deal-close-error" : undefined}
                {...register("expectedClose")}
              />
              {errors.expectedClose ? (
                <p id="deal-close-error" className="text-xs text-destructive" role="alert">
                  {errors.expectedClose.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-owner">Owner</Label>
              <Input
                id="deal-owner"
                placeholder="Amara Osei"
                aria-invalid={Boolean(errors.owner)}
                aria-describedby={errors.owner ? "deal-owner-error" : undefined}
                {...register("owner")}
              />
              {errors.owner ? (
                <p id="deal-owner-error" className="text-xs text-destructive" role="alert">
                  {errors.owner.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-notes">Notes</Label>
            <textarea
              id="deal-notes"
              rows={3}
              placeholder="Context, next steps…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "deal-notes-error" : undefined}
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.notes && "border-destructive",
              )}
              {...register("notes")}
            />
            {errors.notes ? (
              <p id="deal-notes-error" className="text-xs text-destructive" role="alert">
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
                "Create deal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
