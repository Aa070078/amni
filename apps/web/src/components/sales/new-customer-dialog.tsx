"use client";

import { useState, type FormEvent } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amni/ui";
import type { CreateSalesCustomerInput, SalesCustomerType } from "@amni/shared";
import { ApiError } from "@/src/lib/api";
import { createCustomer } from "@/src/lib/sales";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

interface NewCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function NewCustomerDialog({ open, onOpenChange, onCreated }: NewCustomerDialogProps) {
  const [type, setType] = useState<SalesCustomerType>("company");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const input: CreateSalesCustomerInput = { name: String(form.get("name") ?? ""), type, currency };
    const optionalFields: Array<["email" | "phone" | "city" | "billingAddress" | "notes", string]> = [
      ["email", "email"],
      ["phone", "phone"],
      ["city", "city"],
      ["billingAddress", "billingAddress"],
      ["notes", "notes"],
    ];
    for (const [key, fieldName] of optionalFields) {
      const value = form.get(fieldName);
      if (typeof value === "string" && value.trim()) {
        input[key] = value.trim();
      }
    }

    try {
      await createCustomer(input);
      onCreated();
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.fieldErrors?.name?.[0] ?? e.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>
            Create a customer record to start recording sales.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input id="customer-name" name="name" autoComplete="off" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as SalesCustomerType)}>
                <SelectTrigger id="customer-type" aria-label="Customer type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="customer-currency" aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-email">Email</Label>
              <Input id="customer-email" name="email" type="email" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input id="customer-phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-city">City</Label>
              <Input id="customer-city" name="city" autoComplete="address-level2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-address">Billing address</Label>
              <Input id="customer-address" name="billingAddress" autoComplete="street-address" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customer-notes">Notes</Label>
              <Input id="customer-notes" name="notes" />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
