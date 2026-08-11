"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import {
  CRM_CALL_STATUSES,
  createCrmCallLogInputSchema,
  type CreateCrmCallLogInput,
  type CrmCallDirection,
  type CrmReferenceType,
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
import { AmniApiError } from "@/src/lib/client";
import { crmClient } from "@/src/lib/crm";

const DIRECTIONS: { value: CrmCallDirection; label: string }[] = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

const REFERENCE_TYPES: { value: CrmReferenceType; label: string }[] = [
  { value: "deal", label: "Deal" },
  { value: "lead", label: "Lead" },
  { value: "organization", label: "Company" },
  { value: "contact", label: "Contact" },
  { value: "task", label: "Task" },
  { value: "note", label: "Note" },
];

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged: () => void;
  defaultReference?: { type: CrmReferenceType; code: string };
}

export function LogCallDialog({ open, onOpenChange, onLogged, defaultReference }: LogCallDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCrmCallLogInput>({
    resolver: zodResolver(createCrmCallLogInputSchema),
    defaultValues: {
      direction: "outbound",
      status: "completed",
      provider: "internal",
      referenceType: defaultReference?.type ?? null,
      referenceCode: defaultReference?.code ?? "",
    },
  });

  const watchDirection = watch("direction");
  const watchStatus = watch("status");
  const watchReferenceType = watch("referenceType");

  function onSubmit(data: CreateCrmCallLogInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.callLogs
      .create({ ...data, referenceCode: data.referenceCode || null, referenceType: data.referenceType || null })
      .then(() => {
        reset();
        onOpenChange(false);
        onLogged();
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateCrmCallLogInput;
            if (path in createCrmCallLogInputSchema.shape) {
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
          reset();
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a call</DialogTitle>
          <DialogDescription>Record an inbound or outbound call against a CRM record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="call-direction">Direction</Label>
              <Select
                value={watchDirection}
                onValueChange={(value) => setValue("direction", value as CrmCallDirection)}
              >
                <SelectTrigger id="call-direction" aria-label="Direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-status">Status</Label>
              <Select value={watchStatus} onValueChange={(value) => setValue("status", value as CreateCrmCallLogInput["status"])}>
                <SelectTrigger id="call-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_CALL_STATUSES.map(({ value, label }) => (
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
              <Label htmlFor="call-number">Phone number</Label>
              <Input
                id="call-number"
                type="tel"
                placeholder="+1 555-0100"
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-describedby={errors.phoneNumber ? "call-number-error" : undefined}
                {...register("phoneNumber")}
              />
              {errors.phoneNumber ? (
                <p id="call-number-error" className="text-xs text-destructive" role="alert">
                  {errors.phoneNumber.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-duration">Duration (seconds)</Label>
              <Input
                id="call-duration"
                type="number"
                min="0"
                placeholder="180"
                aria-invalid={Boolean(errors.durationSeconds)}
                {...register("durationSeconds")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="call-agent">Agent</Label>
            <Input id="call-agent" placeholder="Amara Osei" aria-invalid={Boolean(errors.agent)} {...register("agent")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="call-ref-type">Related to</Label>
              <Select
                value={watchReferenceType ?? "none"}
                onValueChange={(value) =>
                  setValue("referenceType", value === "none" ? null : (value as CrmReferenceType))
                }
              >
                <SelectTrigger id="call-ref-type" aria-label="Related to">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {REFERENCE_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-ref-code">Record code</Label>
              <Input
                id="call-ref-code"
                placeholder="ORG-0001"
                disabled={!watchReferenceType}
                aria-invalid={Boolean(errors.referenceCode)}
                {...register("referenceCode")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="call-notes">Notes</Label>
            <textarea
              id="call-notes"
              rows={2}
              placeholder="Call outcome, next steps…"
              aria-invalid={Boolean(errors.notes)}
              className="flex min-h-[48px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("notes")}
            />
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
                  Logging…
                </>
              ) : (
                "Log call"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
