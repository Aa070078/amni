export const iso = (unitsAgo: number, unit: "minute" | "hour" | "day" = "day"): string => {
  const ms = unit === "minute" ? 60_000 : unit === "hour" ? 3_600_000 : 86_400_000;
  return new Date(Date.now() - unitsAgo * ms).toISOString();
};

export const dateOnly = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export function nextCode<T extends string>(records: readonly { code: T }[], prefix: string): T {
  const max = records.reduce((highest, record) => {
    const number = Number(record.code.slice(prefix.length + 1));
    return number > highest ? number : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}` as T;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function sortRecords<T extends Record<string, unknown>>(
  records: T[],
  sortBy: string | undefined,
  sortDir: "asc" | "desc",
  whitelist: ReadonlySet<string>,
): T[] {
  const key = sortBy && whitelist.has(sortBy) ? sortBy : null;
  const dir = sortDir === "asc" ? 1 : -1;
  if (!key) return [...records];
  return [...records].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue === bValue) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    return aValue < bValue ? -1 * dir : dir;
  });
}

export function searchRecords<T extends Record<string, unknown>>(
  records: T[],
  q: string | undefined,
  fields: (keyof T & string)[],
): T[] {
  const term = (q ?? "").toLowerCase().trim();
  if (!term) return records;
  return records.filter((record) => fields.some((field) => String(record[field] ?? "").toLowerCase().includes(term)));
}

export function paginate<T>(records: T[], page: number, pageSize: number): { items: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return { items: records.slice(start, start + pageSize), total: records.length };
}
