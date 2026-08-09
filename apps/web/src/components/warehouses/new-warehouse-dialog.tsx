"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createWarehouseInputSchema,
  WAREHOUSE_STATUSES,
  type CreateWarehouseInput,
  type Warehouse,
} from "@amni/shared";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amni/ui";
import { WarehousesApiError, warehousesClient } from "@/src/lib/warehouses";

interface NewWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (warehouse: Warehouse) => void;
}

const DEFAULT_VALUES: CreateWarehouseInput = { name: "", status: "active", isDefault: false };

export function NewWarehouseDialog({ open, onOpenChange, onCreate }: NewWarehouseDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateWarehouseInput>({
    resolver: zodResolver(createWarehouseInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchStatus = watch("status");
  const watchIsDefault = watch("isDefault");

  function onSubmit(data: CreateWarehouseInput) {
    setError("root", { type: "manual", message: "" });
    warehousesClient
      .create(data)
      .then((warehouse) => {
        reset(DEFAULT_VALUES);
        onOpenChange(false);
        onCreate(warehouse);
      })
      .catch((error: unknown) => {
        if (error instanceof WarehousesApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateWarehouseInput;
            if (path in createWarehouseInputSchema.shape) {
              setError(path, { type: "server", message: messages[0] });
            }
          }
        }
        setError("root", {
          type: "manual",
          message:
            error instanceof WarehousesApiError ? error.message : "Something went wrong. Please try again.",
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
          New warehouse
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New warehouse</DialogTitle>
          <DialogDescription>
            Add a warehouse or storage location to track stock levels against.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="warehouse-name">Name</Label>
            <Input
              id="warehouse-name"
              placeholder="Main Store"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "warehouse-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="warehouse-name-error" className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="warehouse-location">Location</Label>
              <Input
                id="warehouse-location"
                placeholder="450 Market St, San Francisco, CA"
                aria-invalid={Boolean(errors.location)}
                aria-describedby={errors.location ? "warehouse-location-error" : undefined}
                {...register("location")}
              />
              {errors.location ? (
                <p id="warehouse-location-error" className="text-xs text-destructive" role="alert">
                  {errors.location.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warehouse-manager">Manager</Label>
              <Input
                id="warehouse-manager"
                placeholder="Amara Osei"
                aria-invalid={Boolean(errors.manager)}
                aria-describedby={errors.manager ? "warehouse-manager-error" : undefined}
                {...register("manager")}
              />
              {errors.manager ? (
                <p id="warehouse-manager-error" className="text-xs text-destructive" role="alert">
                  {errors.manager.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-status">Status</Label>
            <Select
              value={watchStatus}
              onValueChange={(value) => setValue("status", value as CreateWarehouseInput["status"])}
            >
              <SelectTrigger id="warehouse-status" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSE_STATUSES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="warehouse-default"
              checked={watchIsDefault}
              onCheckedChange={(checked) => setValue("isDefault", checked === true)}
            />
            <Label htmlFor="warehouse-default" className="text-sm font-normal">
              Set as default warehouse
            </Label>
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
                "Create warehouse"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
