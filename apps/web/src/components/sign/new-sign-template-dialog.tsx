"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  SIGN_DOCUMENT_TYPES,
  createSignTemplateInputSchema,
  type CreateSignTemplateInput,
  type SignTemplate,
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
import { signClient } from "@/src/lib/sign";

interface NewSignTemplateDialogProps {
  onCreated: (template: SignTemplate) => void;
}

const DEFAULT_VALUES: CreateSignTemplateInput = {
  name: "",
  documentType: "contract",
  signerRoles: [""],
};

export function NewSignTemplateDialog({ onCreated }: NewSignTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSignTemplateInput>({
    resolver: zodResolver(createSignTemplateInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const signerRoles = watch("signerRoles");

  function onSubmit(data: CreateSignTemplateInput) {
    setError("root", { type: "manual", message: "" });
    signClient
      .createTemplate({ ...data, signerRoles: data.signerRoles.map((role) => role.trim()).filter(Boolean) })
      .then((template) => {
        reset(DEFAULT_VALUES);
        setOpen(false);
        onCreated(template);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateSignTemplateInput;
            if (path in createSignTemplateInputSchema.shape) {
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
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>Create a reusable signing setup for documents you send often.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="sign-template-name">Name</Label>
            <Input
              id="sign-template-name"
              placeholder="Master service agreement"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "sign-template-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="sign-template-name-error" className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sign-template-document-type">Document type</Label>
            <Select
              value={watch("documentType")}
              onValueChange={(value) => setValue("documentType", value as CreateSignTemplateInput["documentType"])}
            >
              <SelectTrigger id="sign-template-document-type" aria-label="Document type">
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
              <p id="sign-template-document-type-error" className="text-xs text-destructive" role="alert">
                {errors.documentType.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Signer roles</Label>
            <p className="text-xs text-muted-foreground">
              The roles that must sign, e.g. &quot;Company representative&quot; and &quot;Client&quot;.
            </p>
            <div className="space-y-2">
              {signerRoles.map((_role, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    aria-label={`Signer role ${index + 1}`}
                    placeholder={`Role ${index + 1}`}
                    aria-invalid={Boolean(errors.signerRoles?.[index])}
                    {...register(`signerRoles.${index}`)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={signerRoles.length <= 1}
                    onClick={() => {
                      const next = signerRoles.filter((_, i) => i !== index);
                      setValue("signerRoles", next.length > 0 ? next : [""]);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={signerRoles.length >= 10}
              onClick={() => setValue("signerRoles", [...signerRoles, ""])}
            >
              Add role
            </Button>
            {errors.signerRoles ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.signerRoles.message ?? "Add at least one signer role."}
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
