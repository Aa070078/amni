import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErpClient } from "./client.js";
import {
  PURCHASING_DOCTYPE,
  SUPPLIER_FIELDS,
  PURCHASE_ORDER_FIELDS,
  PURCHASE_INVOICE_FIELDS,
  buildPurchaseInvoiceDoc,
  buildPurchaseOrderDoc,
  buildSupplierDoc,
  cancelPurchaseInvoice,
  cancelPurchaseOrder,
  createPurchaseInvoice,
  createPurchaseOrder,
  createSupplier,
  findSupplierByName,
  submitPurchaseInvoice,
  submitPurchaseOrder,
} from "./index.js";

const BASE_URL = "https://acme.example.com";
const API_KEY = "0000aa";
const API_SECRET = "secret";

function installFetch(
  handler: (input: string | URL, init: RequestInit) => Response | Promise<Response>,
): { fetchMock: ReturnType<typeof vi.fn>; lastUrl: () => URL; lastInit: () => RequestInit } {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    capturedUrl = new URL(String(input));
    capturedInit = init ?? {};
    return handler(input, init ?? {});
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, lastUrl: () => capturedUrl!, lastInit: () => capturedInit! };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const decoded = (url: URL): string => decodeURIComponent(String(url));

function makeClient(overrides: Partial<ConstructorParameters<typeof ErpClient>[0]> = {}) {
  return new ErpClient({ baseUrl: BASE_URL, apiKey: API_KEY, apiSecret: API_SECRET, allowHost: "acme.example.com", ...overrides });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("purchasing doc builders", () => {
  it("builds a Supplier doc using the field map", () => {
    const doc = buildSupplierDoc({
      name: "Northwind Traders",
      group: "Wholesale",
      email: "sales@northwind.example",
      phone: "+1-555-0100",
      currency: "USD",
      paymentTerms: "Net 30",
      taxId: "US-12345",
      status: "active",
    });
    expect(doc[SUPPLIER_FIELDS.name]).toBe("Northwind Traders");
    expect(doc[SUPPLIER_FIELDS.group]).toBe("Wholesale");
    expect(doc[SUPPLIER_FIELDS.email]).toBe("sales@northwind.example");
    expect(doc[SUPPLIER_FIELDS.phone]).toBe("+1-555-0100");
    expect(doc[SUPPLIER_FIELDS.currency]).toBe("USD");
    expect(doc[SUPPLIER_FIELDS.paymentTerms]).toBe("Net 30");
    expect(doc[SUPPLIER_FIELDS.taxId]).toBe("US-12345");
    expect(doc[SUPPLIER_FIELDS.status]).toBe(0);
  });

  it("maps inactive suppliers to disabled=1", () => {
    const doc = buildSupplierDoc({ name: "X", status: "inactive" });
    expect(doc[SUPPLIER_FIELDS.status]).toBe(1);
  });

  it("builds a Purchase Order doc with computed line amounts", () => {
    const doc = buildPurchaseOrderDoc({
      supplier: "Northwind Traders",
      currency: "USD",
      expectedDate: "2026-09-01",
      items: [
        { product: "PRD-0001", name: "Desk", uom: "pcs", qty: 2, rate: 100 },
        { product: "PRD-0002", name: "Chair", uom: "pcs", qty: 1, rate: 50 },
      ],
    });
    expect(doc[PURCHASE_ORDER_FIELDS.supplier]).toBe("Northwind Traders");
    expect(doc[PURCHASE_ORDER_FIELDS.expectedDate]).toBe("2026-09-01");
    expect(doc.items).toHaveLength(2);
    expect((doc.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      item_code: "PRD-0001",
      qty: 2,
      rate: 100,
      amount: 200,
    });
    expect(doc.grand_total).toBe(250);
  });

  it("builds a Purchase Invoice doc referencing the purchase order", () => {
    const doc = buildPurchaseInvoiceDoc({
      supplier: "Northwind Traders",
      purchaseOrder: "PO-2040",
      dueDate: "2026-09-30",
      items: [{ product: "PRD-0001", qty: 1, rate: 100 }],
    });
    expect(doc[PURCHASE_INVOICE_FIELDS.supplier]).toBe("Northwind Traders");
    expect(doc[PURCHASE_INVOICE_FIELDS.purchaseOrder]).toBe("PO-2040");
    expect(doc[PURCHASE_INVOICE_FIELDS.dueDate]).toBe("2026-09-30");
    expect(doc.grand_total).toBe(100);
  });
});

describe("purchasing client wrappers", () => {
  it("finds a supplier by name with doctype-scoped fields", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: [{ name: "SUP-0001", supplier_name: "Northwind Traders" }] }));
    const client = makeClient();
    const found = await findSupplierByName(client, "Northwind Traders");
    expect(found?.name).toBe("SUP-0001");
    expect(String(lastUrl())).toContain(`/resource/${PURCHASING_DOCTYPE.supplier}`);
  });

  it("creates a supplier through the Supplier doctype", async () => {
    const { lastUrl, lastInit } = installFetch(() => jsonResponse(200, { data: { name: "SUP-0001", supplier_name: "Northwind Traders" } }));
    const client = makeClient();
    await createSupplier(client, { name: "Northwind Traders" });
    expect(String(lastUrl())).toContain(`/resource/${PURCHASING_DOCTYPE.supplier}`);
    expect(JSON.parse(String(lastInit().body))).toMatchObject({ supplier_name: "Northwind Traders" });
  });

  it("creates a purchase order then submits and cancels it", async () => {
    const { fetchMock, lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "PO-2040" } }));
    const client = makeClient();
    const doc = await createPurchaseOrder(client, { supplier: "Northwind Traders", items: [{ product: "PRD-0001", qty: 1, rate: 100 }] });
    expect(doc.name).toBe("PO-2040");
    expect(decoded(lastUrl())).toContain(`/resource/${PURCHASING_DOCTYPE.purchaseOrder}`);

    await submitPurchaseOrder(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=submit");

    await cancelPurchaseOrder(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=cancel");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("creates, submits and cancels a purchase invoice", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "PINV-0001" } }));
    const client = makeClient();
    const doc = await createPurchaseInvoice(client, { supplier: "Northwind Traders", items: [{ product: "PRD-0001", qty: 1, rate: 100 }] });
    expect(doc.name).toBe("PINV-0001");
    expect(decoded(lastUrl())).toContain(`/resource/${PURCHASING_DOCTYPE.purchaseInvoice}`);

    await submitPurchaseInvoice(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=submit");

    await cancelPurchaseInvoice(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=cancel");
  });
});
