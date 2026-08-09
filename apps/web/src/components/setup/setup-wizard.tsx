"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, PartyPopper } from "lucide-react";
import type { WizardDraft, WizardStep } from "@amni/shared";
import { Button, Card, CardContent, Progress } from "@amni/ui";
import { wizardClient } from "@/src/lib/wizard";
import {
  BusinessStep,
  CompanyStep,
  ImportStep,
  RegionalStep,
  ReviewStep,
  TeamStep,
} from "./setup-steps";

const STEP_ORDER: WizardStep[] = ["company", "regional", "business", "team", "import", "review"];

const STEP_TITLES: Record<WizardStep, string> = {
  company: "Tell us about your company",
  regional: "Regional settings",
  business: "How do you run the business?",
  team: "Invite your team",
  import: "Import your data",
  review: "Review & launch",
};

export function SetupWizard() {
  const router = useRouter();
  const [draft, setDraft] = React.useState<WizardDraft | null>(null);
  const [currentStep, setCurrentStep] = React.useState<WizardStep>("company");
  const [completed, setCompleted] = React.useState<WizardStep[]>([]);
  const [provisioned, setProvisioned] = React.useState<string | null>(null);

  const draftQuery = useQuery({
    queryKey: ["wizard", "draft"],
    queryFn: () => wizardClient.draft(),
    retry: false,
  });

  React.useEffect(() => {
    if (draftQuery.data) {
      setDraft(draftQuery.data);
      setCurrentStep(draftQuery.data.currentStep);
      setCompleted(draftQuery.data.completedSteps);
    }
  }, [draftQuery.data]);

  const statusQuery = useQuery({
    queryKey: ["wizard", "status"],
    queryFn: () => wizardClient.status(),
    enabled: Boolean(draftQuery.data),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (input: Partial<WizardDraft>) => wizardClient.save(input),
    onSuccess: (data) => setDraft(data),
  });

  const submitMutation = useMutation({
    mutationFn: () => wizardClient.submit(),
    onSuccess: (data) => {
      setProvisioned(data.message ?? "Your workspace is ready.");
    },
  });

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const progress = Math.round(((completed.length + (currentStep === "review" ? 1 : 0)) / STEP_ORDER.length) * 100);
  const isLastStep = currentStep === "review";

  const advance = () => {
    const nextIndex = Math.min(stepIndex + 1, STEP_ORDER.length - 1);
    if (nextIndex === STEP_ORDER.length - 1 && currentStep === STEP_ORDER[STEP_ORDER.length - 1]) {
      submitMutation.mutate();
      return;
    }
    const nextStep = STEP_ORDER[nextIndex] ?? "review";
    const nextCompleted = completed.includes(currentStep) ? completed : [...completed, currentStep];
    saveMutation.mutate({
      ...draft,
      currentStep: nextStep,
      completedSteps: nextCompleted,
    });
    setCompleted(nextCompleted);
    setCurrentStep(nextStep);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      router.push("/dashboard");
      return;
    }
    const prevStep = STEP_ORDER[stepIndex - 1] ?? "company";
    saveMutation.mutate({ currentStep: prevStep, completedSteps: completed });
    setCurrentStep(prevStep);
  };

  if (draftQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (draftQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Setup is unavailable right now. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statusQuery.data?.status === "ready" && !provisioned) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold">Workspace ready</h1>
            <p className="text-sm text-muted-foreground">
              Your workspace has already been provisioned. Jump back in where you left off.
            </p>
            <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (provisioned) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <PartyPopper className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold">You&apos;re all set</h1>
            <p className="text-sm text-muted-foreground">{provisioned}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
              <Button variant="outline" onClick={() => router.push("/settings/company")}>
                Review settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few details and Amni will provision your company, adapt every screen to it, and get your team going.
        </p>
      </header>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {STEP_ORDER.length}
          </span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} aria-label={`Setup progress ${progress}%`} />
      </div>

      <Card className="flex-1">
        <CardContent className="space-y-6 pt-6">
          <h2 className="text-lg font-semibold">{STEP_TITLES[currentStep]}</h2>
          {currentStep === "company" ? (
            <CompanyStep draft={draft} onChange={setDraft} />
          ) : currentStep === "regional" ? (
            <RegionalStep draft={draft} onChange={setDraft} />
          ) : currentStep === "business" ? (
            <BusinessStep draft={draft} onChange={setDraft} />
          ) : currentStep === "team" ? (
            <TeamStep draft={draft} onChange={setDraft} />
          ) : currentStep === "import" ? (
            <ImportStep draft={draft} onChange={setDraft} />
          ) : (
            <ReviewStep draft={draft} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} disabled={saveMutation.isPending || submitMutation.isPending}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {stepIndex === 0 ? "Dashboard" : "Back"}
        </Button>
        <Button
          onClick={advance}
          disabled={saveMutation.isPending || submitMutation.isPending}
          className="min-w-40"
        >
          {saveMutation.isPending || submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : isLastStep ? (
            <PartyPopper className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
          {isLastStep ? "Set up workspace" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
