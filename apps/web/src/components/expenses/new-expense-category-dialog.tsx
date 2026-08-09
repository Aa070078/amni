"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { createExpenseCategoryInputSchema, type CreateExpenseCategoryInput, type ExpenseCategoryRecord } from "@amni/shared";
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
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { expensesClient } from "@/src/lib/expenses";

interface NewExpenseCategoryDialogProps {
  onCreated: (category: ExpenseCategoryRecord) => void;
}

const DEFAULT_VALUES: CreateExpenseCategoryInput = {
  name: "",
  color: "zinc",
};

export function NewExpenseCategoryDialog({ onCreated }: NewExpenseCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseCategoryInput>({
    resolver: zodResolver(createExpenseCategoryInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(data: CreateExpenseCategoryInput) {
    setError("root", { type: "manual", message: "" });
    expensesClient
      .createCategory(data)
      .then((category) => {
        reset(DEFAULT_VALUES);
        setOpen(false);
        onCreated(category);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateExpenseCategoryInput;
            if (path in createExpenseCategoryInputSchema.shape) {
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
          New category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New expense category</DialogTitle>
          <DialogDescription>Add a category to organize expenses and claims.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              placeholder="Client entertainment"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "category-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="category-name-error" className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-color">Color token</Label>
            <Input
              id="category-color"
              placeholder="zinc"
              aria-invalid={Boolean(errors.color)}
              aria-describedby={errors.color ? "category-color-error" : undefined}
              {...register("color")}
            />
            {errors.color ? (
              <p id="category-color-error" className="text-xs text-destructive" role="alert">
                {errors.color.message}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              A design-token color name used when tagging expenses (e.g. "zinc").
            </p>
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
                "Create category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
