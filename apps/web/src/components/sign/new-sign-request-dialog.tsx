"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { SIGN_DOCUMENT_TYPES, createSignRequestInputSchema, type CreateSignRequestInput, type SignRequest } from "@amni/shared";
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
import { AmniApiError } from "@/src/lib/client";
import { signClient } from "@/src/lib/sign";

interface NewSignRequestDialogProps {
  onCreated: (request: SignRequest) => void;
}

const DEFAULT_VALUES: CreateSignRequestInput = {
  title: "",
  documentType: "contract",
  signers: [{ name: "", email: "" }],
};

export function NewSignRequestDialog({ onCreated }: NewSignRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSignRequestInput>({
    resolver: zodResolver(createSignRequestInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "signers" });
  const watchDocumentType = watch("documentType");

  function onSubmit(data: CreateSignRequestInput) {
    setError("root", { type: "manual", message: "" });
    signClient
      .createRequest({
        ...data,
        signers: data.signers.map((signer) => ({
          ...signer,
          name: signer.name.trim(),
          email: signer.email.trim(),
          role: signer.role?.trim() || undefined,
        })),
      })
      .then((request) => {
        reset(DEFAULT_VALUES);
        setOpen(false);
        onCreated(request);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateSignRequestInput;
            if (path in createSignRequestInputSchema.shape) {
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
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New signature request</DialogTitle>
          <DialogDescription>Send a document for signature to one or more signers.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="sign-request-title">Title</Label>
            <Input
              id="sign-request-title"
              placeholder="Master service agreement — Acme Corp"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "sign-request-title-error" : undefined}
              {...register("title")}
            />
            {errors.title ? (
              <p id="sign-request-title-error" className="text-xs text-destructive" role="alert">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sign-request-document-type">Document type</Label>
            <Select
              value={watchDocumentType}
              onValueChange={(value) => setValue("documentType", value as CreateSignRequestInput["documentType"])}
            >
              <SelectTrigger id="sign-request-document-type" aria-label="Document type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGN_DOCUMENT_TYPES.map((documentType) => (
                  <SelectItem key={documentType.value} value={documentType.value}>
                    {documentType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.documentType ? (
              <p id="sign-request-document-type-error" className="text-xs text-destructive" role="alert">
                {errors.documentType.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sign-request-document-code">Document code</Label>
            <Input
              id="sign-request-document-code"
              placeholder="Optional, e.g. INV-2026-0001"
              aria-invalid={Boolean(errors.documentCode)}
              aria-describedby={errors.documentCode ? "sign-request-document-code-error" : undefined}
              {...register("documentCode")}
            />
            {errors.documentCode ? (
              <p id="sign-request-document-code-error" className="text-xs text-destructive" role="alert">
                {errors.documentCode.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Signers</Label>
              <p className="text-xs text-muted-foreground">At least one signer is required.</p>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Signer {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label={`Remove signer ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sign-request-signer-name-${index}`}>Name</Label>
                  <Input
                    id={`sign-request-signer-name-${index}`}
                    placeholder="Alex Johnson"
                    aria-invalid={Boolean(errors.signers?.[index]?.name)}
                    aria-describedby={
                      errors.signers?.[index]?.name ? `sign-request-signer-name-${index}-error` : undefined
                    }
                    {...register(`signers.${index}.name`)}
                  />
                  {errors.signers?.[index]?.name ? (
                    <p id={`sign-request-signer-name-${index}-error`} className="text-xs text-destructive" role="alert">
                      {errors.signers[index].name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sign-request-signer-email-${index}`}>Email</Label>
                  <Input
                    id={`sign-request-signer-email-${index}`}
                    type="email"
                    placeholder="alex@company.com"
                    aria-invalid={Boolean(errors.signers?.[index]?.email)}
                    aria-describedby={
                      errors.signers?.[index]?.email ? `sign-request-signer-email-${index}-error` : undefined
                    }
                    {...register(`signers.${index}.email`)}
                  />
                  {errors.signers?.[index]?.email ? (
                    <p id={`sign-request-signer-email-${index}-error`} className="text-xs text-destructive" role="alert">
                      {errors.signers[index].email.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sign-request-signer-role-${index}`}>Role</Label>
                  <Input
                    id={`sign-request-signer-role-${index}`}
                    placeholder="e.g. Signatory"
                    aria-invalid={Boolean(errors.signers?.[index]?.role)}
                    {...register(`signers.${index}.role`)}
                  />
                  {errors.signers?.[index]?.role ? (
                    <p id={`sign-request-signer-role-${index}-error`} className="text-xs text-destructive" role="alert">
                      {errors.signers[index].role.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={fields.length >= 20}
              onClick={() => append({ name: "", email: "" })}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add signer
            </Button>
            {errors.signers ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.signers.message ?? "Add at least one signer."}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sign-request-notes">Notes</Label>
            <textarea
              id="sign-request-notes"
              rows={3}
              placeholder="Optional instructions for signers…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "sign-request-notes-error" : undefined}
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.notes && "border-destructive",
              )}
              {...register("notes")}
            />
            {errors.notes ? (
              <p id="sign-request-notes-error" className="text-xs text-destructive" role="alert">
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
                "Create request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
