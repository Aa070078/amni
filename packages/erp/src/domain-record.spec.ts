import { describe, expect, it, vi } from "vitest";

import { buildDomainRecordDocument, domainRecordKey, listDomainRecords, parseDomainRecordDocument } from "./domain-record.js";
import type { ErpClient } from "./client.js";

describe("domain records", () => {
  it("builds a namespaced, indexed document", () => {
    expect(buildDomainRecordDocument("equity", "shareholder", "SH-0001", { code: "SH-0001" }, { title: "Founder", numericValue: 100 })).toMatchObject({ record_key: "equity:shareholder:SH-0001", title: "Founder", numeric_value: 100 });
  });

  it("keeps identical codes distinct across domains and types", () => {
    expect(domainRecordKey("sign", "template", "0001")).not.toBe(domainRecordKey("equity", "shareholder", "0001"));
  });

  it("round-trips a JSON contract payload", () => {
    const document = buildDomainRecordDocument("esg", "metric", "M1", { value: 42 });
    expect(parseDomainRecordDocument<{ value: number }>(document)).toEqual({ value: 42 });
  });

  it("calls the bounded bridge method with tenant-domain filters", async () => {
    const call = vi.fn().mockResolvedValue({ items: [{ payload: JSON.stringify({ code: "SIG-0001" }) }], total: 1 });
    const result = await listDomainRecords<{ code: string }>({ call } as unknown as ErpClient, "sign", "request", { q: "NDA", pageLength: 25 });
    expect(call).toHaveBeenCalledWith("amni_bridge.api.list_domain_records", expect.objectContaining({ domain: "sign", record_type: "request", q: "NDA", page_length: 25 }));
    expect(result).toEqual({ items: [{ code: "SIG-0001" }], total: 1 });
  });
});
