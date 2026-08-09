"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createStockMovementInputSchema,
  MOVEMENT_TYPES,
  type CreateStockMovementInput,
  type MovementType,
  type StockMovement,
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
import { StockMovementsApiError, stockMovementsClient } from "@/src/lib/stock-movements";

interface NewStockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (movement: StockMovement) => void;
}

export function NewStockMovementDialog({ open, onOpenChange, onCreate }: NewStockMovementDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateStockMovementInput>({
    resolver: zodResolver(createStockMovementInputSchema),
    defaultValues: { type: "in" },
  });

  const watchType = watch("type");
  const showFrom = watchType === "out" || watchType === "transfer" || watchType === "adjust";
  const showTo = watchType === "in" || watchType === "transfer" || watchType === "adjust";

  function onSubmit(data: CreateStockMovementInput) {
    setError("root", { type: "manual", message: "" });
    stockMovementsClient
      .create(data)
      .then((movement) => {
        reset({ type: "in" });
        onOpenChange(false);
        onCreate(movement);
      })
      .catch((error: unknown) => {
        if (error instanceof StockMovementsApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateStockMovementInput;
            if (path in createStockMovementInputSchema.shape) {
              setError(path, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message:
            error instanceof StockMovementsApiError ? error.message : "Something went wrong. Please try again.",
        });
      });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset({ type: "in" });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New movement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New stock movement</DialogTitle>
          <DialogDescription>
            Record an inbound, outbound, transfer, or adjustment movement against a product.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="movement-type">Type</Label>
            <Select
              value={watchType}
              onValueChange={(value) => setValue("type", value as MovementType)}
            >
              <SelectTrigger id="movement-type" aria-label="Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="movement-product">Product code</Label>
              <Input
                id="movement-product"
                placeholder="PRD-0001"
                aria-invalid={Boolean(errors.productCode)}
                aria-describedby={errors.productCode ? "movement-product-error" : undefined}
                {...register("productCode")}
              />
              {errors.productCode ? (
                <p id="movement-product-error" className="text-xs text-destructive" role="alert">
                  {errors.productCode.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movement-quantity">Quantity</Label>
              <Input
                id="movement-quantity"
                type="number"
                min="1"
                step="1"
                placeholder="100"
                aria-invalid={Boolean(errors.quantity)}
                aria-describedby={errors.quantity ? "movement-quantity-error" : undefined}
                {...register("quantity")}
              />
              {errors.quantity ? (
                <p id="movement-quantity-error" className="text-xs text-destructive" role="alert">
                  {errors.quantity.message}
                </p>
              ) : null}
            </div>
          </div>

          {showFrom ? (
            <div className="space-y-1.5">
              <Label htmlFor="movement-from">From warehouse</Label>
              <Input
                id="movement-from"
                placeholder="WH-0001"
                aria-invalid={Boolean(errors.fromWarehouse)}
                aria-describedby={errors.fromWarehouse ? "movement-from-error" : undefined}
                {...register("fromWarehouse")}
              />
              {errors.fromWarehouse ? (
                <p id="movement-from-error" className="text-xs text-destructive" role="alert">
                  {errors.fromWarehouse.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {showTo ? (
            <div className="space-y-1.5">
              <Label htmlFor="movement-to">To warehouse</Label>
              <Input
                id="movement-to"
                placeholder="WH-0002"
                aria-invalid={Boolean(errors.toWarehouse)}
                aria-describedby={errors.toWarehouse ? "movement-to-error" : undefined}
                {...register("toWarehouse")}
              />
              {errors.toWarehouse ? (
                <p id="movement-to-error" className="text-xs text-destructive" role="alert">
                  {errors.toWarehouse.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="movement-reason">Reason</Label>
              <Input
                id="movement-reason"
                placeholder="Supplier delivery"
                aria-invalid={Boolean(errors.reason)}
                aria-describedby={errors.reason ? "movement-reason-error" : undefined}
                {...register("reason")}
              />
              {errors.reason ? (
                <p id="movement-reason-error" className="text-xs text-destructive" role="alert">
                  {errors.reason.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movement-reference">Reference</Label>
              <Input
                id="movement-reference"
                placeholder="PO-0021"
                aria-invalid={Boolean(errors.reference)}
                aria-describedby={errors.reference ? "movement-reference-error" : undefined}
                {...register("reference")}
              />
              {errors.reference ? (
                <p id="movement-reference-error" className="text-xs text-destructive" role="alert">
                  {errors.reference.message}
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
                "Create movement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
