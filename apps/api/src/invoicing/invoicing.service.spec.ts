import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ErpGatewayService, GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { InvoicingService } from "./invoicing.service";

const USER: GatewayUser = { id: "user-a", email: "owner@acme.test", role: "owner" };
const META: GatewayRequestMeta = { requestId: "req-invoicing", ip: "127.0.0.1" };
const now = "2026-08-18T12:00:00.000Z";

function createGateway(): ErpGatewayService {
  const docs = new Map<string, Record<string, unknown>>([
    ["Company:Acme", { name: "Acme", doctype: "Company", default_currency: "USD", creation: now, modified: now }],
    ["Sales Invoice:INV-1", { name: "INV-1", doctype: "Sales Invoice", customer: "CUS-1", customer_name: "Acme", posting_date: "2026-08-18", currency: "USD", grand_total: 1000, base_grand_total: 1000, outstanding_amount: 600, base_outstanding_amount: 600, is_return: 0, docstatus: 1, items: [{ item_code: "ITEM-1", item_name: "Support", uom: "pcs", qty: 1, rate: 1000 }], creation: now, modified: now }],
    ["Sales Invoice:CRN-1", { name: "CRN-1", doctype: "Sales Invoice", customer: "CUS-1", customer_name: "Acme", posting_date: "2026-08-18", currency: "USD", grand_total: -100, base_grand_total: -100, outstanding_amount: -100, base_outstanding_amount: -100, is_return: 1, return_against: "INV-1", docstatus: 1, items: [{ item_code: "ITEM-1", item_name: "Support", uom: "pcs", qty: -1, rate: 100 }], creation: now, modified: now }],
    ["Sales Invoice:TPL-1", { name: "TPL-1", doctype: "Sales Invoice", customer: "CUS-1", customer_name: "Acme", currency: "USD", grand_total: 200, outstanding_amount: 200, is_return: 0, docstatus: 0, items: [{ item_code: "ITEM-1", item_name: "Support", uom: "pcs", qty: 1, rate: 200 }], creation: now, modified: now }],
    ["Auto Repeat:REP-1", { name: "REP-1", doctype: "Auto Repeat", reference_doctype: "Sales Invoice", reference_document: "TPL-1", subject: "Monthly support", start_date: "2026-08-18", next_schedule_date: "2026-09-01", frequency: "Monthly", repeat_on_day: 1, disabled: 0, status: "Active", creation: now, modified: now }],
    ["Purchase Invoice:PINV-1", { name: "PINV-1", doctype: "Purchase Invoice", supplier: "Supplier", due_date: "2026-08-25", grand_total: 300, outstanding_amount: 300, docstatus: 1 }],
  ]);
  let invoiceSequence = 2;
  let repeatSequence = 2;
  return {
    list: vi.fn(async (_user, _meta, doctype, options) => {
      let items = [...docs.values()].filter((doc) => doc.doctype === doctype);
      const filters = options?.filters as Record<string, unknown> | undefined;
      if (filters) items = items.filter((doc) => Object.entries(filters).every(([key, value]) => String(doc[key] ?? "") === String(value)));
      return { items, total: items.length };
    }),
    get: vi.fn(async (_user, _meta, doctype, name) => {
      const doc = docs.get(`${doctype}:${name}`);
      if (!doc) throw Object.assign(new Error("Not Found"), { status: 404 });
      return doc;
    }),
    create: vi.fn(async (_user, _meta, doctype, input) => {
      const name = doctype === "Auto Repeat" ? `REP-${repeatSequence++}` : `INV-${invoiceSequence++}`;
      const items = Array.isArray(input.items) ? input.items as Array<Record<string, unknown>> : [];
      const grandTotal = items.reduce((sum, line) => sum + Number(line.qty ?? 0) * Number(line.rate ?? 0), 0);
      const doc = { name, doctype, docstatus: 0, creation: now, modified: now, grand_total: grandTotal, outstanding_amount: grandTotal, ...input };
      docs.set(`${doctype}:${name}`, doc);
      return doc;
    }),
    update: vi.fn(async (_user, _meta, doctype, name, action, input) => {
      const current = docs.get(`${doctype}:${name}`);
      if (!current) throw Object.assign(new Error("Not Found"), { status: 404 });
      const doc = { ...current, ...input, modified: now, ...(action === "submit" ? { docstatus: 1 } : {}), ...(action === "cancel" ? { docstatus: 2 } : {}) };
      docs.set(`${doctype}:${name}`, doc);
      return doc;
    }),
    remove: vi.fn(async (_user, _meta, doctype, name) => { docs.delete(`${doctype}:${name}`); }),
  } as unknown as ErpGatewayService;
}

describe("InvoicingService ERP persistence", () => {
  let service: InvoicingService;
  beforeEach(() => { service = new InvoicingService(createGateway()); });

  it("computes its overview from native invoice and schedule records", async () => {
    const overview = await service.overview(USER, META);
    expect(overview.creditNotesOutstanding).toBe(100);
    expect(overview.recurringActive).toBe(1);
    expect(overview.dueSoonBills).toHaveLength(1);
  });

  it("creates and submits a return Sales Invoice as a credit note", async () => {
    const note = await service.createCreditNote(USER, META, { invoiceCode: "INV-1", reason: "Service credit", items: [{ product: "ITEM-1", name: "Support", qty: 1, rate: 125 }] });
    expect(note.invoiceCode).toBe("INV-1");
    expect(note.summary.total).toBe(125);
    expect((await service.changeCreditNoteStatus(USER, META, note.code, { status: "issued" })).status).toBe("issued");
  });

  it("creates, updates, pauses, and deletes a native Auto Repeat schedule", async () => {
    const profile = await service.createRecurring(USER, META, { customerCode: "CUS-1", name: "Quarterly care", interval: "quarterly", dayOfPeriod: 5, items: [{ product: "ITEM-1", name: "Support", qty: 1, rate: 400 }] });
    expect(profile.summary.total).toBe(400);
    expect((await service.updateRecurring(USER, META, profile.code, { dayOfPeriod: 10 })).dayOfPeriod).toBe(10);
    expect((await service.changeRecurringStatus(USER, META, profile.code, { status: "paused" })).status).toBe("paused");
    await service.removeRecurring(USER, META, profile.code);
    await expect(service.detailRecurring(USER, META, profile.code)).rejects.toMatchObject({ status: 404 });
  });
});
