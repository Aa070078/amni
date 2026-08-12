"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createOrganizationInputSchema,
  ORGANIZATION_INDUSTRIES,
  ORGANIZATION_STATUSES,
  ORGANIZATION_TERRITORIES,
  type CreateOrganizationInput,
  type Organization,
  type OrganizationIndustry,
  type OrganizationStatus,
  type OrganizationTerritory,
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

interface NewOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (organization: Organization) => void;
}

export function NewOrganizationDialog({ open, onOpenChange, onCreate }: NewOrganizationDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationInputSchema),
    defaultValues: { status: "lead" },
  });

  const watchStatus = watch("status");
  const watchIndustry = watch("industry");
  const watchTerritory = watch("territory");

  function onSubmit(data: CreateOrganizationInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.organizations
      .create(data)
      .then((organization) => {
        reset({ status: "lead" });
        onOpenChange(false);
        onCreate(organization);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateOrganizationInput;
            if (path in createOrganizationInputSchema.shape) {
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
          reset({ status: "lead" });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New company
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New company</DialogTitle>
          <DialogDescription>Add a company or organization to your CRM.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                placeholder="Acme Corp"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "org-name-error" : undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p id="org-name-error" className="text-xs text-destructive" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-status">Status</Label>
              <Select
                value={watchStatus}
                onValueChange={(value) => setValue("status", value as OrganizationStatus)}
              >
                <SelectTrigger id="org-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_STATUSES.map(({ value, label }) => (
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
              <Label htmlFor="org-industry">Industry</Label>
              <Select
                value={watchIndustry ?? ""}
                onValueChange={(value) => setValue("industry", value as OrganizationIndustry)}
              >
                <SelectTrigger id="org-industry" aria-label="Industry">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {ORGANIZATION_INDUSTRIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-territory">Territory</Label>
              <Select
                value={watchTerritory ?? ""}
                onValueChange={(value) => setValue("territory", value as OrganizationTerritory)}
              >
                <SelectTrigger id="org-territory" aria-label="Territory">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_TERRITORIES.map(({ value, label }) => (
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
              <Label htmlFor="org-email">Email</Label>
              <Input id="org-email" type="email" placeholder="hello@acme.com" {...register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">Phone</Label>
              <Input id="org-phone" type="tel" placeholder="+1 555-0100" {...register("phone")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-website">Website</Label>
              <Input id="org-website" type="url" placeholder="https://acme.com" {...register("website")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-linkedin">LinkedIn</Label>
              <Input id="org-linkedin" type="url" placeholder="https://linkedin.com/company/acme" {...register("linkedin")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-revenue">Annual revenue</Label>
              <Input id="org-revenue" type="number" min="0" step="0.01" placeholder="500000" {...register("annualRevenue")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-employees">Employees</Label>
              <Input id="org-employees" type="number" min="0" placeholder="120" {...register("employeeCount")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-owner">Owner</Label>
            <Input id="org-owner" placeholder="Amara Osei" {...register("owner")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-addr1">Address line 1</Label>
              <Input id="org-addr1" placeholder="100 Market St" {...register("address.addressLine1")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-addr2">Address line 2</Label>
              <Input id="org-addr2" placeholder="Suite 400" {...register("address.addressLine2")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-city">City</Label>
              <Input id="org-city" placeholder="San Francisco" {...register("address.city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-state">State</Label>
              <Input id="org-state" placeholder="CA" {...register("address.state")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-zip">ZIP</Label>
              <Input id="org-zip" placeholder="94105" {...register("address.zip")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-notes">Notes</Label>
            <textarea
              id="org-notes"
              rows={2}
              placeholder="Context, next steps…"
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
                "Create company"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
