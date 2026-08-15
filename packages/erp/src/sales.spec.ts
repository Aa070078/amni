import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErpClient } from "./client.js";
import {
  CUSTOMER_FIELDS,
  ITEM_FIELDS,
  buildCustomerDoc,
  buildItemDoc,
  buildSalesInvoiceDoc,
  buildSalesOrderDoc,
  buildSalesPaymentEntryDoc,
  buildStockEntryDoc,
  createCustomer,
  createSalesInvoice,
  createSalesOrder,
  executeStockMovement,
  findCustomerByName,
  recordSalesPaymentEntry,
  SALES_DOCTYPE,
  INVENTORY_DOCTYPE,
  STOCK_ENTRY_TYPE_BY_MOVEMENT,
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

describe("sales doc builders", () => {
  it("builds a Customer doc using the field map", () => {
    const doc = buildCustomerDoc({
      name: "Acme Ltd",
      type: "company",
      group: "Wholesale",
      email: "acme@example.com",
      status: "active",
    });
    expect(doc[CUSTOMER_FIELDS.name]).toBe("Acme Ltd");
    expect(doc[CUSTOMER_FIELDS.type]).toBe("Company");
    expect(doc[CUSTOMER_FIELDS.email]).toBe("acme@example.com");
    expect(doc[CUSTOMER_FIELDS.status]).toBe(0);
  });

  it("maps inactive customers to disabled=1", () => {
    const doc = buildCustomerDoc({ name: "X", status: "inactive" });
    expect(doc[CUSTOMER_FIELDS.status]).toBe(1);
  });

  it("builds a Sales Order doc with computed line amounts", () => {
    const doc = buildSalesOrderDoc({
      customer: "Acme Ltd",
      currency: "USD",
      items: [
        { product: "PRD-0001", name: "Desk", uom: "pcs", qty: 2, rate: 100 },
        { product: "PRD-0002", name: "Chair", uom: "pcs", qty: 1, rate: 50 },
      ],
    });
    expect(doc.items).toHaveLength(2);
    expect((doc.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      item_code: "PRD-0001",
      qty: 2,
      rate: 100,
      amount: 200,
    });
    expect(doc.grand_total).toBe(250);
  });

  it("builds a Sales Invoice doc referencing the sales order", () => {
    const doc = buildSalesInvoiceDoc({ customer: "Acme Ltd", salesOrder: "SO-2040", items: [{ product: "PRD-0001", qty: 1, rate: 100 }] });
    expect(doc.sales_order).toBe("SO-2040");
  });

  it("builds a Payment Entry as a Customer Receive", () => {
    const doc = buildSalesPaymentEntryDoc({ party: "Acme Ltd", paidAmount: 250, method: "bank_transfer" });
    expect(doc).toMatchObject({ party: "Acme Ltd", paid_amount: 250, party_type: "Customer", payment_type: "Receive" });
  });
});

describe("sales client wrappers", () => {
  it("finds a customer by name with doctype-scoped fields", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: [{ name: "CUS-0001", customer_name: "Acme Ltd" }] }));
    const client = makeClient();
    const found = await findCustomerByName(client, "Acme Ltd");
    expect(found?.name).toBe("CUS-0001");
    expect(String(lastUrl())).toContain("/resource/Customer");
  });

  it("creates a customer through the Customer doctype", async () => {
    const { lastUrl, lastInit } = installFetch(() => jsonResponse(200, { data: { name: "CUS-0001", customer_name: "Acme Ltd" } }));
    const client = makeClient();
    await createCustomer(client, { name: "Acme Ltd" });
    expect(String(lastUrl())).toContain(`/resource/${SALES_DOCTYPE.customer}`);
    expect(JSON.parse(String(lastInit().body))).toMatchObject({ customer_name: "Acme Ltd" });
  });

  it("creates then submits a sales order", async () => {
    const { fetchMock, lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "SO-2040" } }));
    const client = makeClient();
    const doc = await createSalesOrder(client, { customer: "Acme Ltd", items: [{ product: "PRD-0001", qty: 1, rate: 100 }] });
    expect(doc.name).toBe("SO-2040");
    expect(decoded(lastUrl())).toContain(`/resource/${SALES_DOCTYPE.salesOrder}`);

    const res = await client.submit<{ name: string }>(SALES_DOCTYPE.salesOrder, doc.name);
    expect(res.name).toBe("SO-2040");
    expect(decoded(lastUrl())).toContain("action=submit");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("records a payment by creating and submitting a Payment Entry", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "PE-0001", party: "Acme Ltd" } }));
    const client = makeClient();
    await recordSalesPaymentEntry(client, { party: "Acme Ltd", paidAmount: 250 });
    const finalUrl = decoded(lastUrl());
    expect(finalUrl).toContain(`/resource/${SALES_DOCTYPE.paymentEntry}`);
    expect(finalUrl).toContain("action=submit");
  });

  it("creates and submits a sales invoice", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "INV-0001" } }));
    const client = makeClient();
    const doc = await createSalesInvoice(client, { customer: "Acme Ltd", items: [{ product: "PRD-0001", qty: 1, rate: 100 }] });
    expect(doc.name).toBe("INV-0001");
    expect(decoded(lastUrl())).toContain(`/resource/${SALES_DOCTYPE.salesInvoice}`);
  });
});

describe("inventory doc builders", () => {
  it("builds an Item doc using the field map", () => {
    const doc = buildItemDoc({ sku: "PRD-0001", name: "Desk", category: "Furniture", price: 100 });
    expect(doc[ITEM_FIELDS.sku]).toBe("PRD-0001");
    expect(doc[ITEM_FIELDS.category]).toBe("Furniture");
    expect(doc[ITEM_FIELDS.price]).toBe(100);
  });

  it("maps movement types to Stock Entry types", () => {
    expect(STOCK_ENTRY_TYPE_BY_MOVEMENT.in).toBe("Material Receipt");
    expect(STOCK_ENTRY_TYPE_BY_MOVEMENT.out).toBe("Material Issue");
    expect(STOCK_ENTRY_TYPE_BY_MOVEMENT.transfer).toBe("Material Transfer");
  });

  it("builds a Stock Entry for a transfer with both warehouses", () => {
    const doc = buildStockEntryDoc({ type: "transfer", productCode: "PRD-0001", quantity: 5, fromWarehouse: "WH-0001", toWarehouse: "WH-0002" });
    expect(doc.stock_entry_type).toBe("Material Transfer");
    expect(doc.items).toEqual([
      expect.objectContaining({ item_code: "PRD-0001", qty: 5, s_warehouse: "WH-0001", t_warehouse: "WH-0002" }),
    ]);
  });
});

describe("inventory client wrappers", () => {
  it("executes a stock movement by creating + submitting a Stock Entry", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "STE-0001" } }));
    const client = makeClient();
    await executeStockMovement(client, { type: "in", productCode: "PRD-0001", quantity: 10, toWarehouse: "WH-0001" });
    const finalUrl = decoded(lastUrl());
    expect(finalUrl).toContain(`/resource/${INVENTORY_DOCTYPE.stockEntry}`);
    expect(finalUrl).toContain("action=submit");
  });
});
