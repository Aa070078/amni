"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { createCrmContactInputSchema, type CreateCrmContactInput, type CrmContact } from "@amni/shared";
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
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { crmClient } from "@/src/lib/crm";

interface NewContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (contact: CrmContact) => void;
  defaultOrganizationCode?: string;
}

export function NewContactDialog({ open, onOpenChange, onCreate, defaultOrganizationCode }: NewContactDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCrmContactInput>({
    resolver: zodResolver(createCrmContactInputSchema),
    defaultValues: { isPrimary: false, organizationCode: defaultOrganizationCode ?? null },
  });

  const watchIsPrimary = watch("isPrimary");

  function onSubmit(data: CreateCrmContactInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.contacts
      .create({ ...data, organizationCode: data.organizationCode || null })
      .then((contact) => {
        reset({ isPrimary: false, organizationCode: defaultOrganizationCode ?? null });
        onOpenChange(false);
        onCreate(contact);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateCrmContactInput;
            if (path in createCrmContactInputSchema.shape) {
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
          reset({ isPrimary: false, organizationCode: defaultOrganizationCode ?? null });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New contact</DialogTitle>
          <DialogDescription>Add a person to your CRM, optionally linked to a company.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-first">First name</Label>
              <Input
                id="contact-first"
                placeholder="Jane"
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={errors.firstName ? "contact-first-error" : undefined}
                {...register("firstName")}
              />
              {errors.firstName ? (
                <p id="contact-first-error" className="text-xs text-destructive" role="alert">
                  {errors.firstName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-last">Last name</Label>
              <Input id="contact-last" placeholder="Doe" {...register("lastName")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" placeholder="jane@acme.com" {...register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-mobile">Mobile</Label>
              <Input id="contact-mobile" type="tel" placeholder="+1 555-0100" {...register("mobileNo")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-title">Job title</Label>
              <Input id="contact-title" placeholder="Head of Procurement" {...register("jobTitle")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-dept">Department</Label>
              <Input id="contact-dept" placeholder="Sales" {...register("department")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Company</Label>
              <Input id="contact-company" placeholder="Acme Corp" {...register("company")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-org">Company code</Label>
              <Input
                id="contact-org"
                placeholder="ORG-0001"
                disabled={Boolean(defaultOrganizationCode)}
                aria-invalid={Boolean(errors.organizationCode)}
                {...register("organizationCode")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-address">Address</Label>
            <Input id="contact-address" placeholder="100 Market St, San Francisco" {...register("address")} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="contact-primary"
              checked={watchIsPrimary}
              onCheckedChange={(checked) => setValue("isPrimary", checked === true)}
            />
            <Label htmlFor="contact-primary" className="text-sm font-normal">
              Primary contact for this company
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-notes">Notes</Label>
            <textarea
              id="contact-notes"
              rows={2}
              placeholder="Context, preferences…"
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
                  Creating…
                </>
              ) : (
                "Create contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
