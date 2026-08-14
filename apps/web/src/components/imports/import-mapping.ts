import type { ImportTemplate } from "@amni/shared";

export interface ColumnMappingDraft {
  sourceHeader: string;
  /** Empty string means the column is skipped. */
  targetField: string;
}

export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Fuzzy-matches an uploaded file header against a template's fields using
 * normalized exact matches first, then containment in either direction.
 * Returns "" when nothing plausible matches.
 */
export function guessTargetField(sourceHeader: string, template: ImportTemplate): string {
  const normalized = normalizeHeader(sourceHeader);
  if (!normalized) return "";

  for (const column of template.columns) {
    if (normalizeHeader(column.field) === normalized || normalizeHeader(column.label) === normalized) {
      return column.field;
    }
  }

  for (const column of template.columns) {
    const field = normalizeHeader(column.field);
    const label = normalizeHeader(column.label);
    if (
      (field.length > 2 && (field.includes(normalized) || normalized.includes(field))) ||
      (label.length > 2 && (label.includes(normalized) || normalized.includes(label)))
    ) {
      return column.field;
    }
  }

  return "";
}

/**
 * Builds a one-to-one draft mapping for every file header. Each template
 * field is assigned at most once; headers without a confident match (or
 * whose match is already taken) are skipped.
 */
export function buildAutoMapping(headers: string[], template: ImportTemplate): ColumnMappingDraft[] {
  const used = new Set<string>();

  return headers.map((sourceHeader) => {
    const guess = guessTargetField(sourceHeader, template);
    if (guess && !used.has(guess)) {
      used.add(guess);
      return { sourceHeader, targetField: guess };
    }
    return { sourceHeader, targetField: "" };
  });
}

export function mappedTargetFields(drafts: ColumnMappingDraft[]): string[] {
  return drafts.filter((draft) => draft.targetField !== "").map((draft) => draft.targetField);
}

export function unmappedRequiredFields(drafts: ColumnMappingDraft[], template: ImportTemplate): string[] {
  const mapped = new Set(mappedTargetFields(drafts));
  return template.columns
    .filter((column) => column.required && !mapped.has(column.field))
    .map((column) => column.label);
}
