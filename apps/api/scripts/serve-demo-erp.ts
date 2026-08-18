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

function domainRecord(
  domain: string,
  recordType: string,
  recordCode: string,
  payload: Record<string, unknown>,
  indexes: Record<string, unknown> = {},
): Record<string, unknown> {
  const recordKey = `${domain}:${recordType}:${recordCode}`;
  return {
    doctype: "Amni Domain Record",
    name: recordKey,
    record_key: recordKey,
    domain,
    record_type: recordType,
    record_code: recordCode,
    payload: JSON.stringify(payload),
    creation: modified(-30),
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
  domainRecord("equity", "share_class", "CLS-0001", { code: "CLS-0001", name: "Common stock", totalShares: 40000, outstandingShares: 40000, pricePerShare: 1, voting: true, status: "active", createdAt: timestamp(-420), updatedAt: timestamp(-30) }, { title: "Common stock", status: "active", numeric_value: 40000, search_text: "CLS-0001 Common stock" }),
  domainRecord("equity", "share_class", "CLS-0002", { code: "CLS-0002", name: "Series Seed preferred", totalShares: 8000, outstandingShares: 8000, pricePerShare: 25, voting: true, liquidationPreference: 1, status: "active", createdAt: timestamp(-120), updatedAt: timestamp(-120) }, { title: "Series Seed preferred", status: "active", numeric_value: 8000, search_text: "CLS-0002 Series Seed preferred" }),
  domainRecord("equity", "shareholder", "SH-0001", { code: "SH-0001", name: "Amara Osei", type: "founder", email: "amara@demo.co", totalShares: 25000, holdings: [{ classCode: "CLS-0001", shares: 25000 }], investedAmount: 10000, joinedAt: timestamp(-420), createdAt: timestamp(-420), updatedAt: timestamp(-30) }, { title: "Amara Osei", category: "founder", numeric_value: 25000, search_text: "SH-0001 Amara Osei amara@demo.co" }),
  domainRecord("equity", "shareholder", "SH-0002", { code: "SH-0002", name: "Meridian Ventures", type: "investor", email: "funds@meridian.vc", totalShares: 8000, holdings: [{ classCode: "CLS-0002", shares: 8000 }], investedAmount: 200000, joinedAt: timestamp(-120), createdAt: timestamp(-122), updatedAt: timestamp(-120) }, { title: "Meridian Ventures", category: "investor", numeric_value: 8000, search_text: "SH-0002 Meridian Ventures funds@meridian.vc" }),
  domainRecord("equity", "round", "RD-0001", { code: "RD-0001", name: "Seed round", type: "seed", announcedDate: timestamp(-130), closedDate: timestamp(-120), amountRaised: 200000, preMoney: 900000, postMoney: 1100000, sharesIssued: 8000, valuation: 1100000, investors: ["Meridian Ventures"], status: "closed", notes: "Priced seed round.", createdAt: timestamp(-132), updatedAt: timestamp(-120) }, { title: "Seed round", status: "closed", category: "seed", numeric_value: 200000, search_text: "RD-0001 Seed round Meridian Ventures" }),
  domainRecord("esg", "metric", "ESG-M01", { code: "ESG-M01", pillar: "environmental", name: "Scope 1 & 2 GHG emissions", value: 182, unit: "tCO2e", period: "2026 Q2", target: 210, status: "on_track", trend: "down" }, { title: "Scope 1 & 2 GHG emissions", status: "on_track", category: "environmental", numeric_value: 182, search_text: "ESG-M01 GHG emissions environmental" }),
  domainRecord("esg", "metric", "ESG-M02", { code: "ESG-M02", pillar: "environmental", name: "Renewable energy share", value: 46, unit: "%", period: "2026 Q2", target: 50, status: "behind", trend: "up" }, { title: "Renewable energy share", status: "behind", category: "environmental", numeric_value: 46, search_text: "ESG-M02 Renewable energy environmental" }),
  domainRecord("esg", "policy", "POL-0001", { code: "POL-0001", name: "Data protection policy", status: "active", lastReviewed: timestamp(-60), nextReview: timestamp(305) }, { title: "Data protection policy", status: "active", search_text: "POL-0001 Data protection policy" }),
  domainRecord("esg", "board_member", "BRD-0001", { code: "BRD-0001", name: "Amara Osei", role: "CFO", independence: "executive", since: "2021" }, { title: "Amara Osei", category: "executive", search_text: "BRD-0001 Amara Osei CFO" }),
  domainRecord("esg", "board_member", "BRD-0002", { code: "BRD-0002", name: "Marcus Chen", role: "Independent Director", independence: "independent", since: "2023" }, { title: "Marcus Chen", category: "independent", search_text: "BRD-0002 Marcus Chen Independent Director" }),
  domainRecord("esg", "report", "ESG-0001", { code: "ESG-0001", period: "FY 2025", status: "published", pillarScore: { environmental: 72, social: 78, governance: 85, overall: 78 }, highlights: ["Reduced Scope 1 & 2 emissions by 11% year over year.", "Board composition reached 50% independent directors."], generatedAt: timestamp(-120) }, { title: "FY 2025", status: "published", event_at: timestamp(-120), search_text: "ESG-0001 FY 2025 published" }),
  domainRecord("sign", "template", "STMP-0001", { code: "STMP-0001", name: "Standard NDA", documentType: "contract", signerRoles: ["Counterparty"], version: 3, status: "active", createdAt: timestamp(-200), updatedAt: timestamp(-40) }, { title: "Standard NDA", status: "active", category: "contract", numeric_value: 3, search_text: "STMP-0001 Standard NDA Counterparty" }),
  domainRecord("sign", "request", "SIG-0001", { code: "SIG-0001", title: "Facilities management retainer renewal", documentType: "contract", documentCode: "CON-0102", status: "awaiting_signature", signers: [{ code: "S-0001", name: "Nadia Rahman", email: "nadia@example.com", role: "Operations Director", status: "signed", signedAt: timestamp(-3) }, { code: "S-0002", name: "Owen Park", email: "owen@example.com", role: "Authorized Signatory", status: "pending" }], expiresAt: timestamp(8), createdBy: "admin@demo.amni", notes: "First signer completed.", createdAt: timestamp(-6), updatedAt: timestamp(-3) }, { title: "Facilities management retainer renewal", status: "awaiting_signature", category: "contract", reference_code: "CON-0102", event_at: timestamp(8), search_text: "SIG-0001 Facilities management Nadia Rahman Owen Park" }),
  domainRecord("sign", "audit", "AUD-DEMO-1", { id: "AUD-DEMO-1", requestCode: "SIG-0001", event: "signed", actor: "Nadia Rahman", at: timestamp(-3), detail: "First signer completed" }, { status: "signed", reference_code: "SIG-0001", event_at: timestamp(-3), search_text: "SIG-0001 signed Nadia Rahman" }),
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
