import { describe, expect, it } from "vitest";

import { buildTemplateCsv, validateImportRows, IMPORT_TEMPLATES, IMPORT_TEMPLATE_BY_KIND } from "./import-engine.js";

describe("import-engine", () => {
  it("registers one template per import kind with required fields", () => {
    expect(IMPORT_TEMPLATES).toHaveLength(5);
    expect(IMPORT_TEMPLATE_BY_KIND.customers.columns.find((c) => c.field === "customer_name")?.required).toBe(true);
  });

  it("builds a template CSV with a header and an example row", () => {
    const csv = buildTemplateCsv("customers");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("Customer Name");
    expect(lines[1]).toContain("Example value");
  });

  it("flags rows missing required fields", () => {
    const mapping = {
      mode: "create" as const,
      columns: [{ sourceHeader: "Customer Name", targetField: "customer_name", required: true }],
    };
    const { summary, issues } = validateImportRows(
      [{ "Customer Name": "Acme" }, { "Customer Name": null }],
      mapping,
      "customers",
    );
    expect(summary.totalRows).toBe(2);
    expect(summary.created).toBe(1);
    expect(summary.failed).toBe(1);
    expect(issues.some((issue) => issue.row === 2 && issue.message.includes("customer_name"))).toBe(true);
  });

  it("rejects mappings targeting unknown fields", () => {
    const mapping = {
      mode: "create" as const,
      columns: [{ sourceHeader: "Name", targetField: "not_a_field", required: false }],
    };
    const { summary, issues } = validateImportRows([{ Name: "Acme" }], mapping, "customers");
    expect(summary.failed).toBe(1);
    expect(issues.some((issue) => issue.message.includes("not_a_field"))).toBe(true);
  });

  it("validates numeric fields", () => {
    const mapping = {
      mode: "create" as const,
      columns: [
        { sourceHeader: "Item Code", targetField: "item_code", required: true },
        { sourceHeader: "Item Name", targetField: "item_name", required: true },
        { sourceHeader: "Rate", targetField: "standard_rate", required: false, type: "number" },
      ],
    };
    const { summary } = validateImportRows(
      [{ "Item Code": "A1", "Item Name": "Widget", Rate: "12.5" }, { "Item Code": "A2", "Item Name": "Gadget", Rate: "abc" }],
      mapping,
      "items",
    );
    expect(summary.created).toBe(1);
    expect(summary.failed).toBe(1);
  });
});
