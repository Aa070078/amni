"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  CONTACT_STATUSES,
  createContactInputSchema,
  type ContactStatus,
  type CreateContactInput,
  type Contact,
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
import { contactsClient } from "@/src/lib/contacts";

const DEFAULT_VALUES: CreateContactInput = {
  firstName: "",
  lastName: undefined,
  email: undefined,
  phone: undefined,
  jobTitle: undefined,
  department: undefined,
  company: undefined,
  address: undefined,
  notes: undefined,
  status: "active",
};

interface NewContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (contact: Contact) => void;
}

export function NewContactDialog({ open, onOpenChange, onCreate }: NewContactDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchStatus = watch("status");

  function onSubmit(data: CreateContactInput) {
    setError("root", { type: "manual", message: "" });
    contactsClient
      .create(data)
      .then((contact) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(contact);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateContactInput;
            if (path in createContactInputSchema.shape) {
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
          New contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New contact</DialogTitle>
          <DialogDescription>
            Add someone you work with to your address book.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-first-name">First name</Label>
              <Input
                id="contact-first-name"
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={errors.firstName ? "contact-first-name-error" : undefined}
                {...register("firstName")}
              />
              {errors.firstName ? (
                <p id="contact-first-name-error" className="text-xs text-destructive" role="alert">
                  {errors.firstName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-last-name">Last name</Label>
              <Input
                id="contact-last-name"
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={errors.lastName ? "contact-last-name-error" : undefined}
                {...register("lastName")}
              />
              {errors.lastName ? (
                <p id="contact-last-name-error" className="text-xs text-destructive" role="alert">
                  {errors.lastName.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "contact-email-error" : undefined}
                {...register("email")}
              />
              {errors.email ? (
                <p id="contact-email-error" className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                {...register("phone")}
              />
              {errors.phone ? (
                <p id="contact-phone-error" className="text-xs text-destructive" role="alert">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-job-title">Job title</Label>
              <Input
                id="contact-job-title"
                aria-invalid={Boolean(errors.jobTitle)}
                aria-describedby={errors.jobTitle ? "contact-job-title-error" : undefined}
                {...register("jobTitle")}
              />
              {errors.jobTitle ? (
                <p id="contact-job-title-error" className="text-xs text-destructive" role="alert">
                  {errors.jobTitle.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-department">Department</Label>
              <Input
                id="contact-department"
                aria-invalid={Boolean(errors.department)}
                aria-describedby={errors.department ? "contact-department-error" : undefined}
                {...register("department")}
              />
              {errors.department ? (
                <p id="contact-department-error" className="text-xs text-destructive" role="alert">
                  {errors.department.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Company</Label>
              <Input
                id="contact-company"
                aria-invalid={Boolean(errors.company)}
                aria-describedby={errors.company ? "contact-company-error" : undefined}
                {...register("company")}
              />
              {errors.company ? (
                <p id="contact-company-error" className="text-xs text-destructive" role="alert">
                  {errors.company.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-status">Status</Label>
              <Select
                value={watchStatus}
                onValueChange={(value) => setValue("status", value as ContactStatus)}
              >
                <SelectTrigger id="contact-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-address">Address</Label>
            <Input
              id="contact-address"
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? "contact-address-error" : undefined}
              {...register("address")}
            />
            {errors.address ? (
              <p id="contact-address-error" className="text-xs text-destructive" role="alert">
                {errors.address.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-notes">Notes</Label>
            <textarea
              id="contact-notes"
              rows={3}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "contact-notes-error" : undefined}
              className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register("notes")}
            />
            {errors.notes ? (
              <p id="contact-notes-error" className="text-xs text-destructive" role="alert">
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
                "Create contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
