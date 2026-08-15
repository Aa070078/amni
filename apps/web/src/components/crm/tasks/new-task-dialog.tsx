"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import {
  createCrmTaskInputSchema,
  CRM_TASK_PRIORITIES,
  CRM_TASK_STATUSES,
  type CreateCrmTaskInput,
  type CrmReferenceType,
  type CrmTask,
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
import { crmClient } from "@/src/lib/crm";

const REFERENCE_TYPES: { value: CrmReferenceType; label: string }[] = [
  { value: "deal", label: "Deal" },
  { value: "lead", label: "Lead" },
  { value: "organization", label: "Company" },
  { value: "contact", label: "Contact" },
  { value: "task", label: "Task" },
  { value: "note", label: "Note" },
];

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (task: CrmTask) => void;
  defaultStatus?: CreateCrmTaskInput["status"];
}

export function NewTaskDialog({ open, onOpenChange, onCreate, defaultStatus = "backlog" }: NewTaskDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCrmTaskInput>({
    resolver: zodResolver(createCrmTaskInputSchema),
    defaultValues: { status: defaultStatus, priority: "medium" },
  });

  const watchStatus = watch("status");
  const watchPriority = watch("priority");
  const watchReferenceType = watch("referenceType");

  function onSubmit(data: CreateCrmTaskInput) {
    setError("root", { type: "manual", message: "" });
    crmClient.tasks
      .create({ ...data, referenceCode: data.referenceCode || null, referenceType: data.referenceType || null })
      .then((task) => {
        reset({ status: defaultStatus, priority: "medium" });
        onOpenChange(false);
        onCreate(task);
      })
      .catch((error: unknown) => {
        if (error instanceof AmniApiError && error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const path = field as keyof CreateCrmTaskInput;
            if (path in createCrmTaskInputSchema.shape) {
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
          reset({ status: defaultStatus, priority: "medium" });
          setError("root", { type: "manual", message: "" });
        }
        onOpenChange(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Create a task, optionally linked to a CRM record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="task-subject">Subject</Label>
            <Input
              id="task-subject"
              placeholder="Follow up on proposal"
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? "task-subject-error" : undefined}
              {...register("subject")}
            />
            {errors.subject ? (
              <p id="task-subject-error" className="text-xs text-destructive" role="alert">
                {errors.subject.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Select value={watchStatus} onValueChange={(value) => setValue("status", value as CreateCrmTaskInput["status"])}>
                <SelectTrigger id="task-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_TASK_STATUSES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={watchPriority} onValueChange={(value) => setValue("priority", value as CreateCrmTaskInput["priority"])}>
                <SelectTrigger id="task-priority" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_TASK_PRIORITIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" {...register("dueDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assigned to</Label>
              <Input id="task-assignee" placeholder="Amara Osei" {...register("assignedTo")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-ref-type">Related to</Label>
              <Select
                value={watchReferenceType ?? "none"}
                onValueChange={(value) =>
                  setValue("referenceType", value === "none" ? null : (value as CrmReferenceType))
                }
              >
                <SelectTrigger id="task-ref-type" aria-label="Related to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {REFERENCE_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-ref-code">Record code</Label>
              <Input id="task-ref-code" placeholder="ORG-0001" disabled={!watchReferenceType} {...register("referenceCode")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <textarea
              id="task-description"
              rows={3}
              placeholder="What needs to happen?"
              className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("description")}
            />
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
                "Create task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
