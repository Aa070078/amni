"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone, Settings2 } from "lucide-react";
import type { CrmSettings } from "@amni/shared";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton, Switch } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { CrmSectionHeader } from "./crm-nav";

type SettingsFormValues = {
  brandName: string;
  defaultOwner: string;
  whatsappEnabled: boolean;
  whatsappAccountName: string;
  whatsappDefaultMessage: string;
  telephonyEnabled: boolean;
  telephonyNumber: string;
  emailEnabled: boolean;
  emailAccount: string;
  emailProvider: string;
};

export function CrmSettingsView() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["crm", "settings"],
    queryFn: () => crmClient.settings.get(),
  });

  const updateSettings = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      crmClient.settings.update({
        brandName: values.brandName,
        defaultOwner: values.defaultOwner,
        whatsapp: {
          enabled: values.whatsappEnabled,
          accountName: values.whatsappAccountName,
          defaultMessage: values.whatsappDefaultMessage,
        },
        telephony: {
          enabled: values.telephonyEnabled,
          number: values.telephonyNumber,
        },
        emailAccount: {
          enabled: values.emailEnabled,
          name: values.emailAccount,
          email: values.emailAccount,
          provider: values.emailProvider as CrmSettings["emailAccount"]["provider"],
        },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["crm", "settings"] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    defaultValues: {
      brandName: "",
      defaultOwner: "",
      whatsappEnabled: false,
      whatsappAccountName: "",
      whatsappDefaultMessage: "",
      telephonyEnabled: false,
      telephonyNumber: "",
      emailEnabled: false,
      emailAccount: "",
      emailProvider: "smtp",
    },
  });

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    reset({
      brandName: settings.brandName,
      defaultOwner: settings.defaultOwner,
      whatsappEnabled: settings.whatsapp.enabled,
      whatsappAccountName: settings.whatsapp.accountName,
      whatsappDefaultMessage: settings.whatsapp.defaultMessage,
      telephonyEnabled: settings.telephony.enabled,
      telephonyNumber: settings.telephony.number,
      emailEnabled: settings.emailAccount.enabled,
      emailAccount: settings.emailAccount.name || settings.emailAccount.email,
      emailProvider: settings.emailAccount.provider,
    });
  }, [settingsQuery.data, reset]);

  function onSubmit(values: SettingsFormValues) {
    updateSettings.mutate(values, {
      onError: (error) => {
        setError("root", {
          type: "manual",
          message: error instanceof AmniApiError ? error.message : "Something went wrong. Please try again.",
        });
      },
    });
  }

  const whatsappEnabled = watch("whatsappEnabled");
  const telephonyEnabled = watch("telephonyEnabled");
  const emailEnabled = watch("emailEnabled");

  return (
    <div className="space-y-6">
      <CrmSectionHeader title="CRM settings" description="Configure defaults, integrations, and communication channels." />

      {settingsQuery.isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : settingsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Settings2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load settings</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void settingsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>Defaults used across the CRM.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-brand">Brand name</Label>
                <Input id="settings-brand" placeholder="Amni CRM" {...register("brandName")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-owner">Default owner</Label>
                <Input id="settings-owner" placeholder="Jane Doe" {...register("defaultOwner")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <CardDescription>Connect your WhatsApp Business account for one-on-one messaging.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchField
                id="settings-whatsapp-enabled"
                label="Enable WhatsApp"
                checked={whatsappEnabled}
                onCheckedChange={(checked) => setValue("whatsappEnabled", checked)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-whatsapp-account">Account name</Label>
                  <Input
                    id="settings-whatsapp-account"
                    placeholder="Sales"
                    disabled={!whatsappEnabled}
                    {...register("whatsappAccountName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="settings-whatsapp-message">Default message</Label>
                  <Input
                    id="settings-whatsapp-message"
                    placeholder="Hi {{contact_name}},…"
                    disabled={!whatsappEnabled}
                    {...register("whatsappDefaultMessage")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Telephony</CardTitle>
              <CardDescription>Configure calling and call logging.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchField
                id="settings-telephony-enabled"
                label="Enable telephony"
                checked={telephonyEnabled}
                onCheckedChange={(checked) => setValue("telephonyEnabled", checked)}
              />
              <div className="space-y-1.5 sm:max-w-xs">
                <Label htmlFor="settings-telephony-number">Number</Label>
                <Input
                  id="settings-telephony-number"
                  type="tel"
                  placeholder="+1 555-0100"
                  disabled={!telephonyEnabled}
                  {...register("telephonyNumber")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email account</CardTitle>
              <CardDescription>Send and log email from your CRM.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchField
                id="settings-email-enabled"
                label="Enable email account"
                checked={emailEnabled}
                onCheckedChange={(checked) => setValue("emailEnabled", checked)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-email-account">Account</Label>
                  <Input
                    id="settings-email-account"
                    placeholder="sales@example.com"
                    disabled={!emailEnabled}
                    {...register("emailAccount")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="settings-email-provider">Provider</Label>
                  <select
                    id="settings-email-provider"
                    disabled={!emailEnabled}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    {...register("emailProvider")}
                  >
                    <option value="frappe_mail">Frappe Mail</option>
                    <option value="imap">IMAP</option>
                    <option value="smtp">SMTP</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {errors.root?.message ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Last updated {settingsQuery.data ? formatCrmDateTime(settingsQuery.data.updatedAt) : "—"}
            </p>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
                  Save settings
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function SwitchField({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
