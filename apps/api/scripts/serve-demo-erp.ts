import { startMockFrappeServer } from "../src/erp-gateway/mock-frappe-server";

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
const timestamp = (offset: number): string => `${isoDay(offset)}T09:00:00.000Z`;

function crmRecord(
  recordType: string,
  recordCode: string,
  payload: Record<string, unknown>,
  indexes: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    doctype: "Amni CRM Record",
    name: recordCode,
    record_type: recordType,
    record_code: recordCode,
    payload: JSON.stringify(payload),
    creation: modified(-7),
    modified: modified(-1),
    ...indexes,
  };
}

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
  crmRecord(
    "organization",
    "ORG-DEMO-1",
    { code: "ORG-DEMO-1", name: "Northstar Studio", industry: "Interior design", website: "https://northstar.example", email: "hello@northstar.example", phone: "+1 415 555 0142", status: "customer", createdAt: timestamp(-90), updatedAt: timestamp(-1) },
    { title: "Northstar Studio", email: "hello@northstar.example", status: "customer", category: "Interior design", search_text: "Northstar Studio Interior design hello@northstar.example" },
  ),
  crmRecord(
    "contact",
    "CC-DEMO-1",
    { code: "CC-DEMO-1", firstName: "Maya", lastName: "Chen", email: "maya@northstar.example", mobileNo: "+1 415 555 0199", jobTitle: "Design Director", company: "Northstar Studio", organizationCode: "ORG-DEMO-1", isPrimary: true, createdAt: timestamp(-60), updatedAt: timestamp(-2) },
    { title: "Maya Chen", email: "maya@northstar.example", category: "Northstar Studio", reference_type: "organization", reference_code: "ORG-DEMO-1", search_text: "Maya Chen Northstar Studio Design Director" },
  ),
  crmRecord(
    "task",
    "TSK-DEMO-1",
    { code: "TSK-DEMO-1", subject: "Send revised workspace proposal", description: "Include the updated seating plan and delivery schedule.", status: "working", priority: "high", dueDate: isoDay(3), assignedTo: "Amara Osei", referenceType: "deal", referenceCode: "DL-0001", completedAt: null, createdAt: timestamp(-5), updatedAt: timestamp(-1) },
    { title: "Send revised workspace proposal", status: "working", category: "high", state_group: "open", assigned_to: "Amara Osei", reference_type: "deal", reference_code: "DL-0001", event_at: isoDay(3), search_text: "revised workspace proposal Amara Osei" },
  ),
  crmRecord(
    "note",
    "NTE-DEMO-1",
    { code: "NTE-DEMO-1", title: "Decision criteria", content: "Maya prioritizes ergonomic certification, a six-week lead time, and a phased installation.", referenceType: "organization", referenceCode: "ORG-DEMO-1", author: "admin@demo.amni", pinned: true, createdAt: timestamp(-4), updatedAt: timestamp(-1) },
    { title: "Decision criteria", category: "pinned", assigned_to: "admin@demo.amni", reference_type: "organization", reference_code: "ORG-DEMO-1", search_text: "Decision criteria ergonomic certification phased installation" },
  ),
  crmRecord(
    "event",
    "evt-demo-1",
    { id: "evt-demo-1", title: "Northstar proposal review", type: "meeting", startsAt: `${isoDay(2)}T10:30:00.000Z`, endsAt: `${isoDay(2)}T11:15:00.000Z`, description: "Review the revised proposal and implementation plan.", participants: [{ name: "Maya Chen", email: "maya@northstar.example" }], referenceType: "organization", referenceCode: "ORG-DEMO-1", reminderBeforeMinutes: 30, createdAt: timestamp(-3) },
    { title: "Northstar proposal review", category: "meeting", reference_type: "organization", reference_code: "ORG-DEMO-1", event_at: `${isoDay(2)}T10:30:00.000Z`, search_text: "Northstar proposal review Maya Chen" },
  ),
  crmRecord(
    "call_log",
    "call-demo-1",
    { id: "call-demo-1", direction: "outbound", status: "completed", phoneNumber: "+1 415 555 0199", agent: "Amara Osei", provider: "internal", startTime: timestamp(-2), endTime: timestamp(-2), durationSeconds: 840, referenceType: "organization", referenceCode: "ORG-DEMO-1", notes: "Confirmed proposal review agenda.", createdAt: timestamp(-2) },
    { title: "+1 415 555 0199", status: "completed", category: "outbound", assigned_to: "Amara Osei", reference_type: "organization", reference_code: "ORG-DEMO-1", event_at: modified(-2), numeric_value: 840, search_text: "Amara Osei confirmed proposal review" },
  ),
  crmRecord(
    "email_template",
    "etp-demo-1",
    { id: "etp-demo-1", name: "Proposal follow-up", subject: "Next steps for {{company}}", body: "Hi {{contact_name}},\n\nThank you for reviewing the proposal. Here are the agreed next steps.\n\nBest,\n{{sender_name}}", referenceType: "deal", createdAt: timestamp(-30) },
    { title: "Proposal follow-up", category: "deal", search_text: "Proposal follow-up next steps" },
  ),
];

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
