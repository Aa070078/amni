"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  UploadCloud,
  X,
} from "lucide-react";
import type { ImportJob, ImportKind, ImportMode, ImportStage, ImportTemplate } from "@amni/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@amni/ui";

import { ApiError } from "@/src/lib/api";
import { importsClient, uploadImportFile } from "@/src/lib/imports";
import {
  buildAutoMapping,
  unmappedRequiredFields,
  type ColumnMappingDraft,
} from "./import-mapping";

const STAGE_ORDER: ImportStage[] = ["PRE_IMPORT", "UPLOAD", "MAPPING", "VALIDATION", "IMPORT", "COMPLETED"];

const STAGE_LABELS: Record<ImportStage, string> = {
  PRE_IMPORT: "Choose data",
  UPLOAD: "Upload",
  MAPPING: "Map columns",
  VALIDATION: "Validate",
  IMPORT: "Import",
  COMPLETED: "Summary",
};

const MODE_LABELS: Record<ImportMode, string> = {
  create: "Create new records",
  update_by_key: "Update existing by key",
  upsert: "Update existing or create",
};

const SKIP = "__skip";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_PATTERN = /\.(csv|xlsx|xls)$/i;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function formatBytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export interface ImportWizardProps {
  initialJob: ImportJob | null;
  onChanged: () => void;
  onClose: () => void;
}

export function ImportWizard({ initialJob, onChanged, onClose }: ImportWizardProps) {
  const [job, setJob] = React.useState<ImportJob | null>(initialJob);
  const [stage, setStage] = React.useState<ImportStage>(initialJob?.stage ?? "PRE_IMPORT");
  const [error, setError] = React.useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["imports", "templates"],
    queryFn: importsClient.templates,
  });

  const template = job ? templatesQuery.data?.items.find((item) => item.kind === job.kind) : undefined;
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const progress = Math.round(((stageIndex + 1) / STAGE_ORDER.length) * 100);

  const fail = React.useCallback((failure: unknown) => setError(errorMessage(failure)), []);
  const clearError = () => setError(null);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Import data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {job ? `Importing ${template?.label ?? job.kind}` : "Bring your existing data into Amni"}
          </p>
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Close import wizard">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div>
        <ol className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Import stages">
          {STAGE_ORDER.map((step, index) => (
            <li key={step} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  index < stageIndex
                    ? "bg-success text-success-foreground"
                    : index === stageIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {index < stageIndex ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs",
                  index === stageIndex ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {STAGE_LABELS[step]}
              </span>
            </li>
          ))}
        </ol>
        <Progress value={progress} aria-label={`Import progress ${progress}%`} />
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-6 pt-6">
          {stage === "PRE_IMPORT" ? (
            <KindStep
              templates={templatesQuery.data?.items ?? []}
              templatesLoading={templatesQuery.isLoading}
              resumeJobId={job?.id ?? null}
              onError={fail}
              clearError={clearError}
              onJob={(next) => {
                setJob(next);
                setStage("UPLOAD");
              }}
              onResume={() => setStage("UPLOAD")}
            />
          ) : null}

          {stage === "UPLOAD" && job ? (
            <UploadStep
              job={job}
              onError={fail}
              clearError={clearError}
              onBack={() => setStage("PRE_IMPORT")}
              onJob={(next) => {
                setJob(next);
                setStage("MAPPING");
              }}
            />
          ) : null}

          {stage === "MAPPING" && job && template ? (
            <MappingStep
              job={job}
              template={template}
              onError={fail}
              clearError={clearError}
              onBack={() => setStage("UPLOAD")}
              onJob={(next) => {
                setJob(next);
                setStage("VALIDATION");
              }}
            />
          ) : null}

          {stage === "VALIDATION" && job ? (
            <ValidationStep
              job={job}
              onError={fail}
              clearError={clearError}
              onBack={() => setStage("MAPPING")}
              onJob={(next) => {
                setJob(next);
                setStage("IMPORT");
              }}
            />
          ) : null}

          {stage === "IMPORT" && job ? (
            <ImportStep
              job={job}
              onError={fail}
              onJob={(next) => {
                setJob(next);
                setStage("COMPLETED");
              }}
            />
          ) : null}

          {stage === "COMPLETED" && job ? (
            <SummaryStep
              job={job}
              onError={fail}
              onChanged={onChanged}
              onRestart={() => {
                setJob(null);
                setStage("PRE_IMPORT");
              }}
              onClose={onClose}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

interface KindStepProps {
  templates: ImportTemplate[];
  templatesLoading: boolean;
  resumeJobId: string | null;
  onError: (error: unknown) => void;
  clearError: () => void;
  onJob: (job: ImportJob) => void;
  onResume: () => void;
}

function KindStep({ templates, templatesLoading, resumeJobId, onError, clearError, onJob, onResume }: KindStepProps) {
  const [selectedKind, setSelectedKind] = React.useState<ImportKind | null>(null);

  const createMutation = useMutation({
    mutationFn: (kind: ImportKind) => importsClient.create({ kind }),
    onSuccess: onJob,
    onError,
  });

  const advance = () => {
    clearError();
    if (resumeJobId) {
      onResume();
      return;
    }
    if (selectedKind) createMutation.mutate(selectedKind);
  };

  if (templatesLoading) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading templates…</p>;
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">What would you like to import?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((item) => {
            const selected = selectedKind === item.kind;
            return (
              <button
                key={item.kind}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedKind(item.kind)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-primary bg-accent" : "hover:border-primary/40",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{item.label}</span>
                  {selected ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {item.columns.map((column) => `${column.label}${column.required ? " *" : ""}`).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">* Required column. Download the template to see the expected format.</p>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={!selectedKind}
          asChild={Boolean(selectedKind)}
        >
          {selectedKind ? (
            <a href={importsClient.templateCsvUrl(selectedKind)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download CSV template
            </a>
          ) : (
            <span>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download CSV template
            </span>
          )}
        </Button>
        <Button
          type="button"
          onClick={advance}
          disabled={!resumeJobId && !selectedKind || createMutation.isPending}
          className="min-w-36"
        >
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          Continue
        </Button>
      </div>
    </div>
  );
}

interface UploadStepProps {
  job: ImportJob;
  onError: (error: unknown) => void;
  clearError: () => void;
  onBack: () => void;
  onJob: (job: ImportJob) => void;
}

function UploadStep({ job, onError, clearError, onBack, onJob }: UploadStepProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImportFile(job.id, file),
    onSuccess: onJob,
    onError,
  });

  const startUpload = (file: File | undefined) => {
    clearError();
    setFileError(null);
    if (!file) return;
    if (!FILE_PATTERN.test(file.name)) {
      setFileError("Unsupported file type. Upload a .csv or .xlsx file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 10 MB.");
      return;
    }
    uploadMutation.mutate(file);
  };

  const metadata = job.fileMetadata;

  return (
    <div className="space-y-6">
      {metadata ? (
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <FileSpreadsheet className="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{metadata.filename}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(metadata.size)} · {metadata.totalRows} rows · {metadata.headers.length} columns
            </p>
          </div>
          <Badge variant="success">Parsed</Badge>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a CSV or XLSX file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            startUpload(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragOver ? "border-primary bg-accent" : "hover:border-primary/40",
          )}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Drag and drop your file here, or click to browse</p>
          <p className="text-xs text-muted-foreground">CSV or XLSX, up to 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={(event) => startUpload(event.target.files?.[0] ?? undefined)}
          />
        </div>
      )}

      {fileError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {fileError}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack} disabled={uploadMutation.isPending}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => onJob(job)}
          disabled={!metadata || uploadMutation.isPending}
          className="min-w-36"
        >
          {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          {uploadMutation.isPending ? "Uploading…" : "Continue to mapping"}
        </Button>
      </div>
    </div>
  );
}

interface MappingStepProps {
  job: ImportJob;
  template: ImportTemplate;
  onError: (error: unknown) => void;
  clearError: () => void;
  onBack: () => void;
  onJob: (job: ImportJob) => void;
}

function MappingStep({ job, template, onError, clearError, onBack, onJob }: MappingStepProps) {
  const headers = job.fileMetadata?.headers ?? [];
  const autoDrafts = React.useMemo<ColumnMappingDraft[]>(() => {
    if (!job.fileMetadata) return [];
    if (job.mapping) {
      return job.mapping.columns.map((column) => ({
        sourceHeader: column.sourceHeader,
        targetField: column.targetField,
      }));
    }
    return buildAutoMapping(job.fileMetadata.headers, template);
  }, [job, template]);

  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [mode, setMode] = React.useState<ImportMode>(job.mapping?.mode ?? "create");
  const [keyField, setKeyField] = React.useState<string>(job.mapping?.keyField ?? "");

  const drafts: ColumnMappingDraft[] = autoDrafts.map((draft) => ({
    ...draft,
    targetField: overrides[draft.sourceHeader] ?? draft.targetField,
  }));
  const mappedTargets = drafts.filter((draft) => draft.targetField !== "").map((draft) => draft.targetField);
  const missingRequired = unmappedRequiredFields(drafts, template);
  const keyed = mode !== "create";
  const keyMissing = keyed && !keyField;

  const saveMutation = useMutation({
    mutationFn: () => {
      const columns = drafts
        .filter((draft) => draft.targetField !== "")
        .map((draft) => {
          const templateColumn = template.columns.find((column) => column.field === draft.targetField);
          return {
            sourceHeader: draft.sourceHeader,
            targetField: draft.targetField,
            required: templateColumn?.required ?? false,
            type: templateColumn?.type,
          };
        });
      return importsClient.saveMapping(job.id, {
        mode,
        keyField: keyed ? keyField : undefined,
        columns,
      });
    },
    onSuccess: onJob,
    onError,
  });

  const previewRows = job.fileMetadata?.preview.slice(0, 5) ?? [];
  const previewHeaders = headers.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="import-mode">How should records be written?</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as ImportMode)}>
            <SelectTrigger id="import-mode" aria-label="Import mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MODE_LABELS) as ImportMode[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {MODE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {keyed ? (
          <div className="space-y-2">
            <Label htmlFor="import-key-field">Key column used to match existing records</Label>
            <Select value={keyField || SKIP} onValueChange={(value) => setKeyField(value === SKIP ? "" : value)}>
              <SelectTrigger id="import-key-field" aria-label="Key field">
                <SelectValue placeholder="Pick a mapped column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SKIP}>No key column</SelectItem>
                {mappedTargets.map((field) => (
                  <SelectItem key={field} value={field}>
                    {template.columns.find((column) => column.field === field)?.label ?? field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Match your file columns to Amni fields</p>
        <p className="text-xs text-muted-foreground">
          We guessed the matches below — change any column or skip it.
        </p>
        <div className="grid gap-2">
          {drafts.map((draft) => {
            const target = template.columns.find((column) => column.field === draft.targetField);
            return (
              <div key={draft.sourceHeader} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <span className="truncate rounded-md border px-3 py-2 text-sm" title={draft.sourceHeader}>
                  {draft.sourceHeader}
                </span>
                <ArrowRight className="hidden h-4 w-4 justify-self-center text-muted-foreground sm:flex" aria-hidden="true" />
                <Select
                  value={draft.targetField || SKIP}
                  onValueChange={(value) =>
                    setOverrides((previous) => ({ ...previous, [draft.sourceHeader]: value === SKIP ? "" : value }))
                  }
                >
                  <SelectTrigger aria-label={`Map column ${draft.sourceHeader}`}>
                    <SelectValue placeholder="Skip column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SKIP}>Skip column</SelectItem>
                    {template.columns.map((column) => (
                      <SelectItem key={column.field} value={column.field}>
                        {column.label}
                        {column.required ? " *" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {target?.required && !draft.targetField ? (
                  <p className="text-xs text-destructive sm:col-span-3">
                    “{target.label}” is required — map a column to it before continuing.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {previewRows.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Preview (first {previewRows.length} rows)</p>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap text-xs">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={index}>
                    {previewHeaders.map((header) => (
                      <TableCell key={header} className="max-w-40 truncate text-xs">
                        {row[header] === null || row[header] === undefined ? "" : String(row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {missingRequired.length > 0 ? (
        <p role="alert" className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          Required fields not mapped yet: {missingRequired.join(", ")}.
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack} disabled={saveMutation.isPending}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => {
            clearError();
            saveMutation.mutate();
          }}
          disabled={saveMutation.isPending || missingRequired.length > 0 || keyMissing || mappedTargets.length === 0}
          className="min-w-36"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          Save & validate
        </Button>
      </div>
    </div>
  );
}

interface ValidationStepProps {
  job: ImportJob;
  onError: (error: unknown) => void;
  clearError: () => void;
  onBack: () => void;
  onJob: (job: ImportJob) => void;
}

function ValidationStep({ job, onError, clearError, onBack, onJob }: ValidationStepProps) {
  const [showOnlyErrors, setShowOnlyErrors] = React.useState(false);

  const validationQuery = useQuery({
    queryKey: ["imports", job.id, "validation"],
    queryFn: () => importsClient.validation(job.id),
    retry: false,
  });

  const executeMutation = useMutation({
    mutationFn: () => importsClient.execute(job.id),
    onSuccess: onJob,
    onError,
  });

  if (validationQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking your data…
      </p>
    );
  }

  if (validationQuery.isError || !validationQuery.data) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(validationQuery.error)}
        </p>
        <Button variant="outline" type="button" onClick={() => validationQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { summary, issues } = validationQuery.data;
  const errorIssues = issues.filter((issue) => issue.severity === "error");
  const visibleIssues = showOnlyErrors ? errorIssues : issues;
  const blocked = errorIssues.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <ValidationStat label="Rows" value={summary.totalRows} />
        <ValidationStat label="Ready to import" value={summary.created} tone="success" />
        <ValidationStat label="With errors" value={summary.failed} tone={summary.failed > 0 ? "destructive" : undefined} />
        <ValidationStat label="Warnings" value={summary.warnings} tone={summary.warnings > 0 ? "warning" : undefined} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {blocked
            ? "Fix the errors below (or go back and adjust the file/mapping) before importing."
            : "Everything looks good — you can start the import."}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="show-only-errors" className="text-xs text-muted-foreground">
            Show only errors
          </Label>
          <Switch id="show-only-errors" checked={showOnlyErrors} onCheckedChange={setShowOnlyErrors} />
        </div>
      </div>

      {visibleIssues.length > 0 ? (
        <div className="max-h-72 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-xs">Row</TableHead>
                <TableHead className="text-xs">Column</TableHead>
                <TableHead className="w-24 text-xs">Severity</TableHead>
                <TableHead className="text-xs">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleIssues.slice(0, 100).map((issue, index) => (
                <TableRow key={index}>
                  <TableCell className="text-xs">{issue.row ?? "—"}</TableCell>
                  <TableCell className="text-xs">{issue.column ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={issue.severity === "error" ? "destructive" : "warning"}>
                      {issue.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{issue.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No issues found.</p>
      )}
      {visibleIssues.length > 100 ? (
        <p className="text-xs text-muted-foreground">Showing the first 100 of {visibleIssues.length} issues.</p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack} disabled={executeMutation.isPending}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to mapping
        </Button>
        <Button
          type="button"
          onClick={() => {
            clearError();
            executeMutation.mutate();
          }}
          disabled={blocked || executeMutation.isPending}
          className="min-w-36"
        >
          {executeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          Start import
        </Button>
      </div>
    </div>
  );
}

function ValidationStat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" | "destructive" }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface ImportStepProps {
  job: ImportJob;
  onError: (error: unknown) => void;
  onJob: (job: ImportJob) => void;
}

function ImportStep({ job, onError, onJob }: ImportStepProps) {
  const [pollFailed, setPollFailed] = React.useState(false);
  const jobId = job.id;

  React.useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const timer = setInterval(() => {
      attempts += 1;
      importsClient
        .get(jobId)
        .then((fresh) => {
          if (cancelled) return;
          if (fresh.stage === "COMPLETED") {
            clearInterval(timer);
            onJob(fresh);
          } else if (attempts >= MAX_POLL_ATTEMPTS) {
            clearInterval(timer);
            setPollFailed(true);
          }
        })
        .catch((failure) => {
          if (cancelled) return;
          if (attempts >= MAX_POLL_ATTEMPTS) {
            clearInterval(timer);
            setPollFailed(true);
            onError(failure);
          }
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, onJob, onError]);

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      {pollFailed ? (
        <>
          <p className="text-sm text-muted-foreground">
            The import is taking longer than expected. It keeps running in the background — check back in a
            moment.
          </p>
          <Button variant="outline" type="button" onClick={() => window.location.reload()}>
            Check status
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Importing your data…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep this page open — results appear here as soon as the import finishes.
            </p>
          </div>
          <Progress value={90} aria-label="Import in progress" className="max-w-xs" />
        </>
      )}
    </div>
  );
}

interface SummaryStepProps {
  job: ImportJob;
  onError: (error: unknown) => void;
  onChanged: () => void;
  onRestart: () => void;
  onClose: () => void;
}

function SummaryStep({ job, onError, onChanged, onRestart, onClose }: SummaryStepProps) {
  const [confirmRollback, setConfirmRollback] = React.useState(false);

  const summaryQuery = useQuery({
    queryKey: ["imports", job.id, "summary"],
    queryFn: () => importsClient.summary(job.id),
    retry: false,
  });

  const rollbackMutation = useMutation({
    mutationFn: () => importsClient.rollback(job.id),
    onSuccess: () => {
      onChanged();
      onRestart();
    },
    onError,
  });

  if (summaryQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading results…
      </p>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(summaryQuery.error)}
        </p>
        <Button variant="outline" type="button" onClick={() => summaryQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { summary, errorRowsUrl } = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
          <Check className="h-6 w-6 text-success" aria-hidden="true" />
        </span>
        <h3 className="text-base font-semibold">Import finished</h3>
        <p className="text-sm text-muted-foreground">
          {summary.created + summary.updated} of {summary.totalRows} rows were written to your ERP.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <ValidationStat label="Created" value={summary.created} tone="success" />
        <ValidationStat label="Updated" value={summary.updated} />
        <ValidationStat label="Skipped" value={summary.skipped} />
        <ValidationStat label="Failed" value={summary.failed} tone={summary.failed > 0 ? "destructive" : undefined} />
        <ValidationStat label="Warnings" value={summary.warnings} tone={summary.warnings > 0 ? "warning" : undefined} />
      </div>

      {errorRowsUrl ? (
        <Button variant="outline" size="sm" type="button" asChild>
          <a href={errorRowsUrl}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download failed rows
          </a>
        </Button>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {confirmRollback ? (
            <>
              <span className="text-xs text-muted-foreground">Undo this import?</span>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={() => rollbackMutation.mutate()}
                disabled={rollbackMutation.isPending}
              >
                {rollbackMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                Yes, roll back
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmRollback(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" type="button" onClick={() => setConfirmRollback(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Roll back import
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" type="button" onClick={onRestart}>
            Import more data
          </Button>
          <Button
            type="button"
            onClick={() => {
              onChanged();
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
