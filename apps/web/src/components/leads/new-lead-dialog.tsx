"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createLeadInputSchema,
  LEAD_SOURCES,
  LEAD_STAGES,
  type CreateLeadInput,
  type Lead,
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
import { leadsClient, LeadsApiError } from "@/src/lib/leads";

const CURRENCIES = ["USD", "GBP", "EUR"];

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (lead: Lead) => void;
}

export function NewLeadDialog({ open, onOpenChange, onCreate }: NewLeadDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadInputSchema),
    defaultValues: { source: "website", stage: "new", currency: "USD" },
  });

  const watchSource = watch("source");
  const watchStage = watch("stage");
  const watchCurrency = watch("currency");

  function onSubmit(data: CreateLeadInput) {
    setError("root", { type: "manual", message: "" });
    leadsClient
      .create(data)
      .then((lead) => {
        reset({ source: "website", stage: "new", currency: "USD" });
        onOpenChange(false);
        onCreate(lead);
      })
      .catch((error: unknown) => {
        if (error instanceof LeadsApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateLeadInput;
            if (path in createLeadInputSchema.shape) {
              setError(path, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message: error instanceof LeadsApiError ? error.message : "Something went wrong. Please try again.",
        });
      });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset({ source: "website", stage: "new", currency: "USD" });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Add an opportunity to your pipeline. You can move it between stages later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-company">Company</Label>
              <Input
                id="lead-company"
                placeholder="Acme Inc."
                aria-invalid={Boolean(errors.company)}
                aria-describedby={errors.company ? "lead-company-error" : undefined}
                {...register("company")}
              />
              {errors.company ? (
                <p id="lead-company-error" className="text-xs text-destructive" role="alert">
                  {errors.company.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-contact">Contact name</Label>
              <Input
                id="lead-contact"
                placeholder="Jane Doe"
                aria-invalid={Boolean(errors.contactName)}
                aria-describedby={errors.contactName ? "lead-contact-error" : undefined}
                {...register("contactName")}
              />
              {errors.contactName ? (
                <p id="lead-contact-error" className="text-xs text-destructive" role="alert">
                  {errors.contactName.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Contact email</Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="jane@acme.com"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
                aria-describedby={errors.contactEmail ? "lead-email-error" : undefined}
                {...register("contactEmail")}
              />
              {errors.contactEmail ? (
                <p id="lead-email-error" className="text-xs text-destructive" role="alert">
                  {errors.contactEmail.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                type="tel"
                placeholder="+1 555-0100"
                aria-invalid={Boolean(errors.contactPhone)}
                aria-describedby={errors.contactPhone ? "lead-phone-error" : undefined}
                {...register("contactPhone")}
              />
              {errors.contactPhone ? (
                <p id="lead-phone-error" className="text-xs text-destructive" role="alert">
                  {errors.contactPhone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-source">Source</Label>
              <Select value={watchSource} onValueChange={(value) => setValue("source", value as CreateLeadInput["source"])}>
                <SelectTrigger id="lead-source" aria-label="Source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-stage">Stage</Label>
              <Select value={watchStage} onValueChange={(value) => setValue("stage", value as CreateLeadInput["stage"])}>
                <SelectTrigger id="lead-stage" aria-label="Stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map(({ value, label }) => (
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
              <Label htmlFor="lead-value">Value</Label>
              <Input
                id="lead-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="10000"
                aria-invalid={Boolean(errors.value)}
                aria-describedby={errors.value ? "lead-value-error" : undefined}
                {...register("value")}
              />
              {errors.value ? (
                <p id="lead-value-error" className="text-xs text-destructive" role="alert">
                  {errors.value.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-currency">Currency</Label>
              <Select value={watchCurrency} onValueChange={(value) => setValue("currency", value as CreateLeadInput["currency"])}>
                <SelectTrigger id="lead-currency" aria-label="Currency">
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
              <Label htmlFor="lead-close">Expected close</Label>
              <Input
                id="lead-close"
                type="date"
                aria-invalid={Boolean(errors.expectedClose)}
                aria-describedby={errors.expectedClose ? "lead-close-error" : undefined}
                {...register("expectedClose")}
              />
              {errors.expectedClose ? (
                <p id="lead-close-error" className="text-xs text-destructive" role="alert">
                  {errors.expectedClose.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-owner">Owner</Label>
              <Input
                id="lead-owner"
                placeholder="Amara Osei"
                aria-invalid={Boolean(errors.owner)}
                aria-describedby={errors.owner ? "lead-owner-error" : undefined}
                {...register("owner")}
              />
              {errors.owner ? (
                <p id="lead-owner-error" className="text-xs text-destructive" role="alert">
                  {errors.owner.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-notes">Notes</Label>
            <textarea
              id="lead-notes"
              rows={3}
              placeholder="Context, next steps…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "lead-notes-error" : undefined}
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.notes && "border-destructive",
              )}
              {...register("notes")}
            />
            {errors.notes ? (
              <p id="lead-notes-error" className="text-xs text-destructive" role="alert">
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
                "Create lead"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
