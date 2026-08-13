import type { ImportContext, ImportDriver, ImportRowResult } from "./import-driver";

/**
 * Simulated import driver for local dev, CI and tests: applies records
 * in-memory so the full pipeline (upload -> mapping -> validation -> import ->
 * summary/error-rows) can be exercised without an ERP site. `create` mode
 * always creates; update/upsert modes track keys per job so repeats update.
 * Set `IMPORT_SIMULATE_FAIL_EVERY_N` to fail every Nth row to exercise the
 * failed-rows / error-download path deterministically.
 */
export class SimulationImportDriver implements ImportDriver {
  readonly name = "simulate";

  private readonly seenKeys = new Set<string>();
  private applied = 0;

  constructor(private readonly failEveryN?: number) {}

  async apply(record: Record<string, string>, context: ImportContext): Promise<ImportRowResult> {
    this.applied++;
    if (this.failEveryN && this.applied % this.failEveryN === 0) {
      return { status: "failed", message: `simulated failure on row ${this.applied} (${context.kind})` };
    }

    if (context.mode === "create") {
      return { status: "created" };
    }

    const key = context.keyField ? record[context.keyField] ?? "" : "";
    if (key === "") {
      return { status: "failed", message: `missing ${context.keyField ?? "key"} value` };
    }
    if (this.seenKeys.has(key)) {
      return { status: "updated" };
    }
    this.seenKeys.add(key);
    return { status: "created" };
  }
}
