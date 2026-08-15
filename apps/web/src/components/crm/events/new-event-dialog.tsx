"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { CRM_EVENT_TYPES, createCrmEventInputSchema, type CreateCrmEventInput, type CrmEvent, type CrmReferenceType } from "@amni/shared";
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
import { crmClient } from "@/src/lib/crm";

const REFERENCE_TYPES: { value: CrmReferenceType; label: string }[] = [
  { value: "deal", label: "Deal" },
  { value: "lead", label: "Lead" },
  { value: "organization", label: "Company" },
  { value: "contact", label: "Contact" },
  { value: "task", label: "Task" },
  { value: "note", label: "Note" },
];

interface NewEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (event: CrmEvent) => void;
}

export function NewEventDialog({ open, onOpenChange, onCreate }: NewEventDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCrmEventInput>({
    resolver: zodResolver(createCrmEventInputSchema),
    defaultValues: { type: "other" },
  });

  const watchReferenceType = watch("referenceType");

  function onSubmit(data: CreateCrmEventInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.events
      .create({ ...data, referenceCode: data.referenceCode || null, referenceType: data.referenceType || null })
      .then((event) => {
        reset({ type: "other" });
        onOpenChange(false);
        onCreate(event);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateCrmEventInput;
            if (path in createCrmEventInputSchema.shape) {
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
          reset({ type: "other" });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          <DialogDescription>Schedule a call, meeting, or follow-up.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="Intro call"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "event-title-error" : undefined}
              {...register("title")}
            />
            {errors.title ? (
              <p id="event-title-error" className="text-xs text-destructive" role="alert">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={watch("type") ?? "other"}
                onValueChange={(value) => setValue("type", value as CreateCrmEventInput["type"])}
              >
                <SelectTrigger id="event-type" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_EVENT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-reminder">Remind before (minutes)</Label>
              <Input
                id="event-reminder"
                type="number"
                min={0}
                placeholder="30"
                aria-invalid={Boolean(errors.reminderBeforeMinutes)}
                aria-describedby={errors.reminderBeforeMinutes ? "event-reminder-error" : undefined}
                {...register("reminderBeforeMinutes")}
              />
              {errors.reminderBeforeMinutes ? (
                <p id="event-reminder-error" className="text-xs text-destructive" role="alert">
                  {errors.reminderBeforeMinutes.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-starts-at">Starts at</Label>
              <Input
                id="event-starts-at"
                type="datetime-local"
                aria-invalid={Boolean(errors.startsAt)}
                aria-describedby={errors.startsAt ? "event-starts-at-error" : undefined}
                {...register("startsAt", {
                  setValueAs: (value: string) => (value ? new Date(value).toISOString() : value),
                })}
              />
              {errors.startsAt ? (
                <p id="event-starts-at-error" className="text-xs text-destructive" role="alert">
                  {errors.startsAt.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-ends-at">Ends at</Label>
              <Input
                id="event-ends-at"
                type="datetime-local"
                aria-invalid={Boolean(errors.endsAt)}
                aria-describedby={errors.endsAt ? "event-ends-at-error" : undefined}
                {...register("endsAt", {
                  setValueAs: (value: string) => (value ? new Date(value).toISOString() : undefined),
                })}
              />
              {errors.endsAt ? (
                <p id="event-ends-at-error" className="text-xs text-destructive" role="alert">
                  {errors.endsAt.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description">Description</Label>
            <textarea
              id="event-description"
              rows={3}
              placeholder="Agenda, attendees, notes…"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "event-description-error" : undefined}
              className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("description")}
            />
            {errors.description ? (
              <p id="event-description-error" className="text-xs text-destructive" role="alert">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-ref-type">Related to</Label>
              <Select
                value={watchReferenceType ?? "none"}
                onValueChange={(value) =>
                  setValue("referenceType", value === "none" ? null : (value as CrmReferenceType))
                }
              >
                <SelectTrigger id="event-ref-type" aria-label="Related to">
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
              <Label htmlFor="event-ref-code">Record code</Label>
              <Input id="event-ref-code" placeholder="ORG-0001" disabled={!watchReferenceType} {...register("referenceCode")} />
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
                "Create event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
