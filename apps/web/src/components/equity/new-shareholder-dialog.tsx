"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SHAREHOLDER_TYPES, createShareholderInputSchema, type CreateShareholderInput, type Shareholder } from "@amni/shared";
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
import { equityClient } from "@/src/lib/equity";

interface NewShareholderDialogProps {
  onCreated: (shareholder: Shareholder) => void;
}

const DEFAULT_VALUES: CreateShareholderInput = {
  name: "",
  type: "founder",
  holdings: [{ classCode: "", shares: 0 }],
  investedAmount: 0,
};

export function NewShareholderDialog({ onCreated }: NewShareholderDialogProps) {
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
  } = useForm<CreateShareholderInput>({
    resolver: zodResolver(createShareholderInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "holdings" });

  const classesQuery = useQuery({
    queryKey: ["equity", "classes", "options"],
    queryFn: () => equityClient.listClasses({ page: 1, pageSize: 100, status: "active" }),
    enabled: open,
  });
  const classes = classesQuery.data?.items ?? [];

  function onSubmit(data: CreateShareholderInput) {
    setError("root", { type: "manual", message: "" });
    equityClient
      .createShareholder({
        ...data,
        holdings: data.holdings.map((holding) => ({ ...holding, shares: Number(holding.shares) })),
      })
      .then((shareholder) => {
        reset(DEFAULT_VALUES);
        setOpen(false);
        onCreated(shareholder);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateShareholderInput;
            if (path in createShareholderInputSchema.shape) {
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
          Shareholder
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New shareholder</DialogTitle>
          <DialogDescription>Add a founder, investor, or employee and their holdings.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="shareholder-name">Name</Label>
            <Input
              id="shareholder-name"
              placeholder="Jane Smith"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "shareholder-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="shareholder-name-error" className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="shareholder-type">Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as CreateShareholderInput["type"])}
              >
                <SelectTrigger id="shareholder-type" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHAREHOLDER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type ? (
                <p id="shareholder-type-error" className="text-xs text-destructive" role="alert">
                  {errors.type.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shareholder-email">Email</Label>
              <Input
                id="shareholder-email"
                type="email"
                placeholder="jane@company.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Holdings</Label>
              <p className="text-xs text-muted-foreground">At least one share class holding is required.</p>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Holding {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label={`Remove holding ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`shareholder-class-${index}`}>Class</Label>
                    <Select
                      value={watch(`holdings.${index}.classCode`)}
                      onValueChange={(value) => setValue(`holdings.${index}.classCode`, value)}
                    >
                      <SelectTrigger id={`shareholder-class-${index}`} aria-label={`Class for holding ${index + 1}`}>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((shareClass) => (
                          <SelectItem key={shareClass.code} value={shareClass.code}>
                            {shareClass.name} ({shareClass.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.holdings?.[index]?.classCode ? (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.holdings[index].classCode.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`shareholder-shares-${index}`}>Shares</Label>
                    <Input
                      id={`shareholder-shares-${index}`}
                      type="number"
                      min="0"
                      step="1"
                      aria-invalid={Boolean(errors.holdings?.[index]?.shares)}
                      {...register(`holdings.${index}.shares`)}
                    />
                    {errors.holdings?.[index]?.shares ? (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.holdings[index].shares.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" disabled={fields.length >= 20} onClick={() => append({ classCode: "", shares: 0 })}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add holding
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="shareholder-invested">Invested amount</Label>
              <Input
                id="shareholder-invested"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.investedAmount)}
                {...register("investedAmount")}
              />
              {errors.investedAmount ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.investedAmount.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shareholder-joined">Joined</Label>
              <Input
                id="shareholder-joined"
                type="date"
                {...register("joinedAt", { setValueAs: (value) => (value ? new Date(value).toISOString() : undefined) })}
              />
              {errors.joinedAt ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.joinedAt.message}
                </p>
              ) : null}
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
                "Create shareholder"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
