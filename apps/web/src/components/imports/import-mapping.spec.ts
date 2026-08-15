import { describe, expect, it } from "vitest";
import type { ImportTemplate } from "@amni/shared";

import { buildAutoMapping, guessTargetField, normalizeHeader, unmappedRequiredFields } from "./import-mapping";

const template: ImportTemplate = {
  kind: "customers",
  label: "Customers",
  description: "Create customer records in your ERP.",
  columns: [
    { field: "customer_name", label: "Customer Name", required: true, type: "text" },
    { field: "customer_group", label: "Customer Group", required: false, type: "text" },
    { field: "email", label: "Email", required: false, type: "text" },
    { field: "mobile_no", label: "Mobile", required: false, type: "text" },
  ],
};

describe("normalizeHeader", () => {
  it("lowercases and strips non-alphanumerics", () => {
    expect(normalizeHeader("Customer Name ")).toBe("customername");
    expect(normalizeHeader("e-mail_address")).toBe("emailaddress");
  });
});

describe("guessTargetField", () => {
  it("matches exact labels case-insensitively", () => {
    expect(guessTargetField("Customer Name", template)).toBe("customer_name");
    expect(guessTargetField("EMAIL", template)).toBe("email");
  });

  it("matches fuzzy variants", () => {
    expect(guessTargetField("Customer  Name", template)).toBe("customer_name");
    expect(guessTargetField("Mobile No", template)).toBe("mobile_no");
  });

  it("returns empty string when nothing matches", () => {
    expect(guessTargetField("Totally Unknown", template)).toBe("");
    expect(guessTargetField("", template)).toBe("");
  });
});

describe("buildAutoMapping", () => {
  it("maps each header once and skips unknowns", () => {
    const drafts = buildAutoMapping(["Customer Name", "Email", "Notes", "customer_name"], template);

    expect(drafts).toEqual([
      { sourceHeader: "Customer Name", targetField: "customer_name" },
      { sourceHeader: "Email", targetField: "email" },
      { sourceHeader: "Notes", targetField: "" },
      { sourceHeader: "customer_name", targetField: "" },
    ]);
  });
});

describe("unmappedRequiredFields", () => {
  it("reports required fields that are not mapped", () => {
    const drafts = buildAutoMapping(["Email"], template);
    expect(unmappedRequiredFields(drafts, template)).toEqual(["Customer Name"]);
  });

  it("returns nothing when required fields are mapped", () => {
    const drafts = buildAutoMapping(["Customer Name"], template);
    expect(unmappedRequiredFields(drafts, template)).toEqual([]);
  });
});
