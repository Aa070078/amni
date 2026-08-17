import { startMockFrappeServer } from "../src/erp-gateway/mock-frappe-server";
import { buildShowcaseDocs } from "./demo-erp-fixtures";

const apiKey = process.env.DEMO_ERP_API_KEY ?? "demo-service-account";
const apiSecret = process.env.DEMO_ERP_API_SECRET ?? "demo-secret-5b2f1c8a";
const port = Number(process.env.DEMO_ERP_PORT ?? 8080);

const today = new Date();
const isoDay = (offset: number): string => {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const modified = (offset: number): string => `${isoDay(offset)} 09:00:00`;

const docs: Record<string, unknown>[] = [
  {
    doctype: "Sales Invoice",
    name: "SINV-2026-001",
    customer: "Northstar Studio",
    posting_date: isoDay(-4),
    due_date: isoDay(10),
    grand_total: 84_200,
    outstanding_amount: 24_200,
    status: "Unpaid",
    docstatus: 1,
    creation: modified(-4),
    modified: modified(-4),
    owner: "admin@demo.amni",
  },
  {
    doctype: "Sales Invoice",
    name: "SINV-2026-002",
    customer: "Cedar & Co",
    posting_date: isoDay(-12),
    due_date: isoDay(-2),
    grand_total: 52_600,
    outstanding_amount: 12_600,
    status: "Overdue",
    docstatus: 1,
    creation: modified(-12),
    modified: modified(-2),
    owner: "admin@demo.amni",
  },
  {
    doctype: "Sales Invoice",
    name: "SINV-2026-003",
    customer: "Atelier Nine",
    posting_date: isoDay(-34),
    due_date: isoDay(-18),
    grand_total: 47_460,
    outstanding_amount: 0,
    status: "Paid",
    docstatus: 1,
    creation: modified(-34),
    modified: modified(-15),
    owner: "member@demo.amni",
  },
  {
    doctype: "Payment Entry",
    name: "PAY-2026-001",
    payment_type: "Receive",
    paid_amount: 60_000,
    posting_date: isoDay(-3),
    docstatus: 1,
  },
  {
    doctype: "Payment Entry",
    name: "PAY-2026-002",
    payment_type: "Pay",
    paid_amount: 18_400,
    posting_date: isoDay(-6),
    docstatus: 1,
  },
  {
    doctype: "Sales Order",
    name: "SO-2026-014",
    creation: modified(-1),
    modified: modified(-1),
    owner: "member@demo.amni",
  },
  {
    doctype: "Quotation",
    name: "QTN-2026-021",
    creation: modified(-2),
    modified: modified(-2),
    owner: "admin@demo.amni",
  },
  {
    doctype: "Customer",
    name: "CUST-0001",
    customer_name: "Northstar Studio",
    creation: modified(-9),
    modified: modified(-1),
    owner: "admin@demo.amni",
  },
  {
    doctype: "Warehouse",
    name: "Main Warehouse - DC",
    warehouse_name: "Main Warehouse",
    is_group: 0,
    disabled: 0,
  },
  {
    doctype: "Warehouse",
    name: "Showroom - DC",
    warehouse_name: "Showroom",
    is_group: 0,
    disabled: 0,
  },
  {
    doctype: "Item",
    name: "SKU-NIMBUS",
    item_code: "SKU-NIMBUS",
    item_name: "Nimbus task chair",
    standard_rate: 680,
    valuation_rate: 420,
    safety_stock: 8,
    disabled: 0,
  },
  {
    doctype: "Item",
    name: "SKU-ARC",
    item_code: "SKU-ARC",
    item_name: "Arc floor lamp",
    standard_rate: 240,
    valuation_rate: 130,
    safety_stock: 10,
    disabled: 0,
  },
  {
    doctype: "Bin",
    name: "BIN-NIMBUS-MAIN",
    item_code: "SKU-NIMBUS",
    warehouse: "Main Warehouse - DC",
    actual_qty: 18,
    reserved_qty: 3,
    projected_qty: 15,
    valuation_rate: 420,
  },
  {
    doctype: "Bin",
    name: "BIN-ARC-SHOWROOM",
    item_code: "SKU-ARC",
    warehouse: "Showroom - DC",
    actual_qty: 4,
    reserved_qty: 1,
    projected_qty: 3,
    valuation_rate: 130,
  },
];

docs.push(...buildShowcaseDocs({ isoDay, modified }));

async function main(): Promise<void> {
  const server = await startMockFrappeServer({ apiKey, apiSecret, docs, port });
  console.log(`Development ERP stand-in ready at ${server.url} (${docs.length} fixture records)`);
  console.log(
    "This process is for local development only; production requires a real ERPNext bench.",
  );

  const close = async () => {
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void close());
  process.once("SIGTERM", () => void close());
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
