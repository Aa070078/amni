"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { ROUND_TYPES, createRoundInputSchema, type CreateRoundInput, type Round } from "@amni/shared";
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
import { equityClient } from "@/src/lib/equity";

interface NewRoundDialogProps {
  onCreated: (round: Round) => void;
}

const DEFAULT_VALUES: CreateRoundInput = {
  name: "",
  type: "seed",
  amountRaised: 0,
  preMoney: 0,
  postMoney: 0,
  sharesIssued: 0,
  investors: [""],
};

export function NewRoundDialog({ onCreated }: NewRoundDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoundInput>({
    resolver: zodResolver(createRoundInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const investors = watch("investors");

  function onSubmit(data: CreateRoundInput) {
    setError("root", { type: "manual", message: "" });
    equityClient
      .createRound({
        ...data,
        investors: data.investors.map((investor) => investor.trim()).filter(Boolean),
      })
      .then((round) => {
        reset(DEFAULT_VALUES);
        setOpen(false);
        onCreated(round);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateRoundInput;
            if (path in createRoundInputSchema.shape) {
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
          Round
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New funding round</DialogTitle>
          <DialogDescription>Record a raise with its valuation and investors.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="round-name">Name</Label>
              <Input
                id="round-name"
                placeholder="Seed round 2026"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="round-type">Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as CreateRoundInput["type"])}
              >
                <SelectTrigger id="round-type" aria-label="Round type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUND_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.type.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="round-announced">Announced date</Label>
              <Input
                id="round-announced"
                type="date"
                {...register("announcedDate", { setValueAs: (value) => (value ? new Date(value).toISOString() : undefined) })}
              />
              {errors.announcedDate ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.announcedDate.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="round-closed">Closed date</Label>
              <Input
                id="round-closed"
                type="date"
                {...register("closedDate", { setValueAs: (value) => (value ? new Date(value).toISOString() : undefined) })}
              />
              {errors.closedDate ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.closedDate.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="round-amount">Amount raised</Label>
              <Input
                id="round-amount"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.amountRaised)}
                {...register("amountRaised")}
              />
              {errors.amountRaised ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.amountRaised.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="round-shares">Shares issued</Label>
              <Input
                id="round-shares"
                type="number"
                min="0"
                step="1"
                aria-invalid={Boolean(errors.sharesIssued)}
                {...register("sharesIssued")}
              />
              {errors.sharesIssued ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.sharesIssued.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="round-pre-money">Pre-money valuation</Label>
              <Input
                id="round-pre-money"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.preMoney)}
                {...register("preMoney")}
              />
              {errors.preMoney ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.preMoney.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="round-post-money">Post-money valuation</Label>
              <Input
                id="round-post-money"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(errors.postMoney)}
                {...register("postMoney")}
              />
              {errors.postMoney ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.postMoney.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Investors</Label>
            <p className="text-xs text-muted-foreground">Investor names participating in this round.</p>
            {investors.map((_investor, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  aria-label={`Investor ${index + 1}`}
                  placeholder={`Investor ${index + 1}`}
                  {...register(`investors.${index}`)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={investors.length <= 1}
                  onClick={() => {
                    const next = investors.filter((_, i) => i !== index);
                    setValue("investors", next.length > 0 ? next : [""]);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" disabled={investors.length >= 50} onClick={() => setValue("investors", [...investors, ""])}>
              Add investor
            </Button>
            {errors.investors ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.investors.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="round-notes">Notes</Label>
            <textarea
              id="round-notes"
              rows={3}
              placeholder="Optional context about this round…"
              aria-invalid={Boolean(errors.notes)}
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                errors.notes && "border-destructive",
              )}
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-xs text-destructive" role="alert">
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
                "Create round"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
