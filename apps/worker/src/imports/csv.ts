/** Minimal RFC-4180-style CSV writer for the failed-rows download. */
export function buildCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const escape = (value: string | number): string => {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((cells) => cells.map(escape).join(","))];
  return lines.join("\n");
}
