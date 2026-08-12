"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Pin, Plus } from "lucide-react";
import { createCrmNoteInputSchema, type CreateCrmNoteInput, type CrmNote, type CrmReferenceType } from "@amni/shared";
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
  Switch,
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

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (note: CrmNote) => void;
}

export function NewNoteDialog({ open, onOpenChange, onCreate }: NewNoteDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCrmNoteInput>({
    resolver: zodResolver(createCrmNoteInputSchema),
    defaultValues: { pinned: false },
  });

  const watchReferenceType = watch("referenceType");
  const watchPinned = watch("pinned");

  function onSubmit(data: CreateCrmNoteInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.notes
      .create({ ...data, referenceCode: data.referenceCode || null, referenceType: data.referenceType || null })
      .then((note) => {
        reset({ pinned: false });
        onOpenChange(false);
        onCreate(note);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateCrmNoteInput;
            if (path in createCrmNoteInputSchema.shape) {
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
          reset({ pinned: false });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
          <DialogDescription>Capture context, optionally linked to a CRM record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="Meeting recap"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "note-title-error" : undefined}
              {...register("title")}
            />
            {errors.title ? (
              <p id="note-title-error" className="text-xs text-destructive" role="alert">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-content">Content</Label>
            <textarea
              id="note-content"
              rows={5}
              placeholder="What did we cover?"
              aria-invalid={Boolean(errors.content)}
              aria-describedby={errors.content ? "note-content-error" : undefined}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("content")}
            />
            {errors.content ? (
              <p id="note-content-error" className="text-xs text-destructive" role="alert">
                {errors.content.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <Label htmlFor="note-pinned" className="flex items-center gap-2 text-sm">
              <Pin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Pin this note
            </Label>
            <Switch
              id="note-pinned"
              checked={Boolean(watchPinned)}
              onCheckedChange={(checked) => setValue("pinned", checked)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="note-ref-type">Related to</Label>
              <Select
                value={watchReferenceType ?? "none"}
                onValueChange={(value) => setValue("referenceType", value === "none" ? null : (value as CrmReferenceType))}
              >
                <SelectTrigger id="note-ref-type" aria-label="Related to">
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
              <Label htmlFor="note-ref-code">Record code</Label>
              <Input id="note-ref-code" placeholder="ORG-0001" disabled={!watchReferenceType} {...register("referenceCode")} />
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
                "Create note"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
