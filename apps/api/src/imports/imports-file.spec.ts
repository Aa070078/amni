import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { MAX_IMPORT_FILE_SIZE, parseImportFile } from "./imports-file";

const csvBuffer = Buffer.from("Customer Name,Email\nAcme,a@acme.co\nBolt,b@bolt.co\n", "utf-8");

describe("parseImportFile", () => {
  it("parses CSV into headers, preview and rows", () => {
    const metadata = parseImportFile({ filename: "customers.csv", size: csvBuffer.length, buffer: csvBuffer });

    expect(metadata.headers).toEqual(["Customer Name", "Email"]);
    expect(metadata.totalRows).toBe(2);
    expect(metadata.preview).toEqual([
      { "Customer Name": "Acme", Email: "a@acme.co" },
      { "Customer Name": "Bolt", Email: "b@bolt.co" },
    ]);
    expect(metadata.rows).toHaveLength(2);
  });

  it("treats empty CSV cells as null", () => {
    const metadata = parseImportFile({ filename: "customers.csv", size: csvBuffer.length, buffer: Buffer.from("Customer Name,Email\nAcme,\n", "utf-8") });

    expect(metadata.rows[0]?.Email).toBeNull();
  });

  it("parses XLSX workbooks", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Customer Name", "Email"],
      ["Acme", "a@acme.co"],
      ["Bolt", "b@bolt.co"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "customers");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const metadata = parseImportFile({ filename: "customers.xlsx", size: buffer.length, buffer });

    expect(metadata.headers).toEqual(["Customer Name", "Email"]);
    expect(metadata.totalRows).toBe(2);
    expect(metadata.rows[0]).toEqual({ "Customer Name": "Acme", Email: "a@acme.co" });
  });

  it("rejects unsupported file types", () => {
    expect(() => parseImportFile({ filename: "data.txt", size: 10, buffer: Buffer.from("a\n") })).toThrow("IMPORT_FILE_UNSUPPORTED");
  });

  it("rejects empty files", () => {
    expect(() => parseImportFile({ filename: "customers.csv", size: 0, buffer: Buffer.from("", "utf-8") })).toThrow("IMPORT_FILE_EMPTY");
  });

  it("rejects oversized files", () => {
    const buffer = Buffer.alloc(MAX_IMPORT_FILE_SIZE + 1);
    expect(() => parseImportFile({ filename: "customers.csv", size: buffer.length, buffer })).toThrow("IMPORT_FILE_TOO_LARGE");
  });
});
