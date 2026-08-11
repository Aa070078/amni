"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createCrmEmailTemplateInputSchema,
  type CreateCrmEmailTemplateInput,
  type CrmEmailTemplate,
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

interface NewEmailTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (template: CrmEmailTemplate) => void;
}

export function NewEmailTemplateDialog({ open, onOpenChange, onCreate }: NewEmailTemplateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCrmEmailTemplateInput>({
    resolver: zodResolver(createCrmEmailTemplateInputSchema),
  });

  const watchReferenceType = watch("referenceType");

  function onSubmit(data: CreateCrmEmailTemplateInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.emailTemplates
      .create({ ...data, referenceType: data.referenceType || null })
      .then((template) => {
        reset({});
        onOpenChange(false);
        onCreate(template);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateCrmEmailTemplateInput;
            if (path in createCrmEmailTemplateInputSchema.shape) {
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
          reset({});
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New email template</DialogTitle>
          <DialogDescription>Reuse consistent messaging across outreach. Use {"{{variable}}"} placeholders.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              placeholder="Follow-up after intro call"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "template-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="template-name-error" className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-subject">Subject</Label>
            <Input
              id="template-subject"
              placeholder="Re: {{company_name}}"
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? "template-subject-error" : undefined}
              {...register("subject")}
            />
            {errors.subject ? (
              <p id="template-subject-error" className="text-xs text-destructive" role="alert">
                {errors.subject.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-body">Body</Label>
            <textarea
              id="template-body"
              rows={6}
              placeholder={"Hi {{contact_name}},\n\nThanks for your time today…"}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={errors.body ? "template-body-error" : undefined}
              className="flex min-h-[144px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("body")}
            />
            {errors.body ? (
              <p id="template-body-error" className="text-xs text-destructive" role="alert">
                {errors.body.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-ref-type">Related to</Label>
            <Select
              value={watchReferenceType ?? "none"}
              onValueChange={(value) =>
                setValue("referenceType", value === "none" ? null : (value as CrmReferenceType))
              }
            >
              <SelectTrigger id="template-ref-type" aria-label="Related to">
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
            {errors.referenceType ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.referenceType.message}
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
                "Create template"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
