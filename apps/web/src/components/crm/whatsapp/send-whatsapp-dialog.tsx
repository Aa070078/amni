"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { sendCrmWhatsappInputSchema, type CrmReferenceType, type SendCrmWhatsappInput } from "@amni/shared";
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

const REFERENCE_TYPES: { value: CrmReferenceType; label: string }[] = [
  { value: "deal", label: "Deal" },
  { value: "lead", label: "Lead" },
  { value: "organization", label: "Company" },
  { value: "contact", label: "Contact" },
  { value: "task", label: "Task" },
  { value: "note", label: "Note" },
];

interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
  defaultReference?: { type: CrmReferenceType; code: string };
}

export function SendWhatsAppDialog({ open, onOpenChange, onSent, defaultReference }: SendWhatsAppDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SendCrmWhatsappInput>({
    resolver: zodResolver(sendCrmWhatsappInputSchema),
    defaultValues: {
      to: "",
      message: "",
      referenceType: defaultReference?.type ?? null,
      referenceCode: defaultReference?.code ?? "",
    },
  });

  const watchReferenceType = watch("referenceType");

  function onSubmit(data: SendCrmWhatsappInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.whatsapp
      .send({ ...data, referenceCode: data.referenceCode || null, referenceType: data.referenceType || null })
      .then(() => {
        reset({ to: "", message: "", referenceType: null, referenceCode: "" });
        onOpenChange(false);
        onSent();
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof SendCrmWhatsappInput;
            if (path in sendCrmWhatsappInputSchema.shape) {
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
          reset({ to: "", message: "", referenceType: null, referenceCode: "" });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send WhatsApp message</DialogTitle>
          <DialogDescription>Message a contact from WhatsApp, optionally linked to a CRM record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="wa-to">To</Label>
            <Input
              id="wa-to"
              type="tel"
              placeholder="+1 555-0100"
              aria-invalid={Boolean(errors.to)}
              aria-describedby={errors.to ? "wa-to-error" : undefined}
              {...register("to")}
            />
            {errors.to ? (
              <p id="wa-to-error" className="text-xs text-destructive" role="alert">
                {errors.to.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-message">Message</Label>
            <textarea
              id="wa-message"
              rows={4}
              placeholder="Hi, following up on…"
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "wa-message-error" : undefined}
              className="flex min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("message")}
            />
            {errors.message ? (
              <p id="wa-message-error" className="text-xs text-destructive" role="alert">
                {errors.message.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-ref-type">Related to</Label>
              <Select
                value={watchReferenceType ?? "none"}
                onValueChange={(value) =>
                  setValue("referenceType", value === "none" ? null : (value as CrmReferenceType))
                }
              >
                <SelectTrigger id="wa-ref-type" aria-label="Related to">
                  <SelectValue />
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
              <Label htmlFor="wa-ref-code">Record code</Label>
              <Input
                id="wa-ref-code"
                placeholder="ORG-0001"
                disabled={!watchReferenceType}
                {...register("referenceCode")}
              />
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
                  Sending…
                </>
              ) : (
                "Send message"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
