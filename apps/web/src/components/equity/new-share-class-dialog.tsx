"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { createShareClassInputSchema, type CreateShareClassInput, type ShareClass } from "@amni/shared";
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
  Switch,
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { equityClient } from "@/src/lib/equity";

interface NewShareClassDialogProps {
  onCreated: (shareClass: ShareClass) => void;
}

const DEFAULT_VALUES: CreateShareClassInput = {
  name: "",
  totalShares: 0,
  outstandingShares: 0,
  pricePerShare: 0,
  voting: true,
};

export function NewShareClassDialog({ onCreated }: NewShareClassDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateShareClassInput>({
    resolver: zodResolver(createShareClassInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(data: CreateShareClassInput) {
    setError("root", { type: "manual", message: "" });
    equityClient
      .createClass(data)
      .then((shareClass) => {
        reset(DEFAULT_VALUES);
        setOpen(false);
        onCreated(shareClass);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateShareClassInput;
            if (path in createShareClassInputSchema.shape) {
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
          Share class
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New share class</DialogTitle>
          <DialogDescription>Define a class of shares such as common stock or preferred.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="share-class-name">Name</Label>
            <Input
              id="share-class-name"
              placeholder="Common stock"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "share-class-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="share-class-name-error" className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="share-class-total">Total shares</Label>
              <Input
                id="share-class-total"
                type="number"
                min="0"
                step="1"
                aria-invalid={Boolean(errors.totalShares)}
                {...register("totalShares")}
              />
              {errors.totalShares ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.totalShares.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-class-outstanding">Outstanding shares</Label>
              <Input
                id="share-class-outstanding"
                type="number"
                min="0"
                step="1"
                aria-invalid={Boolean(errors.outstandingShares)}
                {...register("outstandingShares")}
              />
              {errors.outstandingShares ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.outstandingShares.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="share-class-price">Price per share</Label>
              <Input
                id="share-class-price"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.pricePerShare)}
                {...register("pricePerShare")}
              />
              {errors.pricePerShare ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.pricePerShare.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-class-liquidation">Liquidation preference</Label>
              <Input
                id="share-class-liquidation"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.liquidationPreference)}
                {...register("liquidationPreference")}
              />
              {errors.liquidationPreference ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.liquidationPreference.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <Label htmlFor="share-class-voting">Voting shares</Label>
              <p className="text-xs text-muted-foreground">Whether this class carries voting rights.</p>
            </div>
            <Switch
              id="share-class-voting"
              checked={watch("voting")}
              onCheckedChange={(checked) => setValue("voting", checked)}
            />
          </div>
          {errors.voting ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.voting.message}
            </p>
          ) : null}

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
                "Create share class"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
