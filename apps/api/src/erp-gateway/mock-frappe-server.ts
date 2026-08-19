import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface MockFrappeRequest {
  method: string;
  url: string;
  authHeader?: string;
}

export interface MockFrappeServer {
  url: string;
  docs: Map<string, Record<string, unknown>>;
  requests: MockFrappeRequest[];
  close: () => Promise<void>;
}

const RESOURCE_PREFIX = "/api/v1/resource/";
const CRM_LIST_PATH = "/api/v1/method/amni_bridge.api.list_crm_records";
const DOMAIN_LIST_PATH = "/api/v1/method/amni_bridge.api.list_domain_records";
const ACCOUNT_BALANCES_PATH = "/api/v1/method/amni_bridge.api.get_account_balances";
const NATIVE_QUERY_PATH = "/api/v1/method/amni_bridge.api.query_native_records";

/**
 * Minimal in-process stand-in for a tenant ERPNext site. It enforces the
 * tenant service account (`Authorization: token api_key:api_secret`) exactly
 * like the real Frappe REST API and serves a small in-memory doc store. Used
 * by the tenant isolation suite so cross-tenant guarantees are tested with a
 * real HTTP client + real resolution path, without a live bench.
 */
export async function startMockFrappeServer(options: {
  apiKey: string;
  apiSecret: string;
  docs: Record<string, unknown>[];
  port?: number;
}): Promise<MockFrappeServer> {
  const docs = new Map<string, Record<string, unknown>>();
  for (const doc of options.docs) {
    docs.set(String(doc.name), doc);
  }
  const requests: MockFrappeRequest[] = [];
  let nextName = 1;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const authHeader = req.headers.authorization;
    requests.push({ method: req.method ?? "GET", url: url.pathname, authHeader });

    if (!authHeader || authHeader !== `token ${options.apiKey}:${options.apiSecret}`) {
      sendJson(res, 401, { message: "Not Permitted", exception: "AuthenticationError" });
      return;
    }

    if (url.pathname === CRM_LIST_PATH && req.method === "POST") {
      const body = (await readJson(req)) ?? {};
      const filters = body.filters && typeof body.filters === "object" ? body.filters as Record<string, unknown> : {};
      const term = String(body.q ?? "").toLowerCase();
      const start = Math.max(0, Number(body.start ?? 0));
      const pageLength = Math.min(100, Math.max(1, Number(body.page_length ?? 20)));
      const items = [...docs.values()].filter((doc) => doc.doctype === "Amni CRM Record")
        .filter((doc) => String(doc.record_type) === String(body.record_type))
        .filter((doc) => Object.entries(filters).every(([field, value]) => value == null || value === "" || String(doc[field] ?? "") === String(value)))
        .filter((doc) => !term || String(doc.search_text ?? "").toLowerCase().includes(term));
      sendJson(res, 200, { message: { items: items.slice(start, start + pageLength), total: items.length } });
      return;
    }

    if (url.pathname === DOMAIN_LIST_PATH && req.method === "POST") {
      const body = (await readJson(req)) ?? {};
      const filters = body.filters && typeof body.filters === "object" ? body.filters as Record<string, unknown> : {};
      const term = String(body.q ?? "").toLowerCase();
      const start = Math.max(0, Number(body.start ?? 0));
      const pageLength = Math.min(100, Math.max(1, Number(body.page_length ?? 20)));
      const items = [...docs.values()].filter((doc) => doc.doctype === "Amni Domain Record")
        .filter((doc) => String(doc.domain) === String(body.domain) && String(doc.record_type) === String(body.record_type))
        .filter((doc) => Object.entries(filters).every(([field, value]) => value == null || value === "" || String(doc[field] ?? "") === String(value)))
        .filter((doc) => !term || String(doc.search_text ?? "").toLowerCase().includes(term));
      sendJson(res, 200, { message: { items: items.slice(start, start + pageLength), total: items.length } });
      return;
    }

    if (url.pathname === ACCOUNT_BALANCES_PATH && req.method === "POST") {
      const balances = new Map<string, number>();
      for (const doc of docs.values()) {
        if (doc.doctype !== "GL Entry" || Number(doc.is_cancelled ?? 0) === 1) continue;
        const account = String(doc.account ?? "");
        balances.set(account, (balances.get(account) ?? 0) + Number(doc.debit ?? 0) - Number(doc.credit ?? 0));
      }
      sendJson(res, 200, { message: { items: [...balances].map(([account, balance]) => ({ account, balance })) } });
      return;
    }

    if (url.pathname === NATIVE_QUERY_PATH && req.method === "POST") {
      const body = (await readJson(req)) ?? {};
      const doctype = String(body.doctype ?? "");
      const filters = body.filters && typeof body.filters === "object" ? body.filters as Record<string, unknown> : {};
      const term = String(body.q ?? "").toLowerCase();
      const start = Math.max(0, Number(body.start ?? 0));
      const pageLength = Math.min(100, Math.max(1, Number(body.page_length ?? 20)));
      const items = [...docs.values()]
        .filter((doc) => !doc.doctype || doc.doctype === doctype)
        .filter((doc) => Object.entries(filters).every(([field, value]) => String(doc[field] ?? "") === String(value)))
        .filter((doc) => !term || Object.values(doc).some((value) => String(value ?? "").toLowerCase().includes(term)));
      sendJson(res, 200, { message: { items: items.slice(start, start + pageLength), total: items.length } });
      return;
    }

    const resource = url.pathname.startsWith(RESOURCE_PREFIX)
      ? url.pathname
          .slice(RESOURCE_PREFIX.length)
          .split("/")
          .filter(Boolean)
          .map((segment) => decodeURIComponent(segment))
      : [];

    if (resource.length === 0) {
      sendJson(res, 404, { message: "Not Found" });
      return;
    }

    const doctype = resource[0];
    const name = resource[1];

    try {
      switch (req.method) {
        case "GET": {
          if (!name) {
            const requestedLimit = Number(url.searchParams.get("limit_page_length") ?? 20);
            const start = Number(url.searchParams.get("start") ?? 0);
            const filters = parseFilters(url.searchParams.get("filters"));
            // Docs created through POST are tagged with their doctype; legacy
            // seeded docs without a tag are returned for any doctype so older
            // isolation fixtures keep working.
            const all = [...docs.values()]
              .filter((doc) => !doc.doctype || doc.doctype === doctype)
              .filter((doc) => matchesFilters(doc, filters));
            const limit = requestedLimit === 0 ? all.length : requestedLimit;
            sendJson(res, 200, { data: all.slice(start, start + limit) });
            return;
          }
          const doc = docs.get(name);
          if (!doc) {
            sendJson(res, 404, { message: "Not Found", exception: `Not Found: ${name}` });
            return;
          }
          sendJson(res, 200, { data: doc });
          return;
        }
        case "POST": {
          const body = await readJson(req);
          const customName = doctype === "Amni CRM Record" ? body?.record_code : doctype === "Amni Domain Record" ? body?.record_key : undefined;
          const docName = String(body?.name ?? customName ?? `${doctype}-${nextName++}`);
          const now = new Date();
          const doc: Record<string, unknown> = {
            name: docName,
            doctype,
            docstatus: 0,
            creation: now.toISOString(),
            modified: now.toISOString(),
            ...(body ?? {}),
          };
          if (!doc.posting_date) doc.posting_date = now.toISOString().slice(0, 10);
          if (doctype === "Sales Invoice" && doc.grand_total == null && Array.isArray(doc.items)) {
            doc.grand_total = doc.items.reduce((sum: number, raw) => {
              const line = raw as Record<string, unknown>;
              return sum + Number(line.qty ?? 0) * Number(line.rate ?? 0);
            }, 0);
          }
          if (doctype === "Sales Invoice" && doc.outstanding_amount == null) {
            doc.outstanding_amount = Number(doc.grand_total ?? 0);
          }
          docs.set(docName, doc);
          sendJson(res, 200, { data: doc });
          return;
        }
        case "PUT": {
          if (!name) {
            sendJson(res, 400, { message: "Name required" });
            return;
          }
          if (!docs.has(name)) {
            sendJson(res, 404, { message: "Not Found", exception: `Not Found: ${name}` });
            return;
          }
          const body = await readJson(req);
          const doc = { ...(docs.get(name) ?? {}), ...(body ?? {}) };
          const action = url.searchParams.get("action");
          if (action === "submit") doc.docstatus = 1;
          if (action === "cancel") doc.docstatus = 2;
          if (doctype === "Payment Entry" && action === "submit") {
            allocatePayment(doc, docs);
          }
          docs.set(name, doc);
          sendJson(res, 200, { data: doc });
          return;
        }
        case "DELETE": {
          if (!name || !docs.has(name)) {
            sendJson(res, 404, { message: "Not Found", exception: `Not Found: ${name ?? ""}` });
            return;
          }
          const doc = docs.get(name)!;
          docs.delete(name);
          sendJson(res, 200, { data: doc });
          return;
        }
        default:
          sendJson(res, 405, { message: "Method Not Allowed" });
      }
    } catch {
      sendJson(res, 500, { message: "Internal Server Error" });
    }
  }

  await new Promise<void>((resolve) => server.listen(options.port ?? 0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Mock ERP server failed to bind");
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    docs,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

type FilterClause = [string, string, unknown];

function allocatePayment(
  payment: Record<string, unknown>,
  docs: Map<string, Record<string, unknown>>,
): void {
  const references = Array.isArray(payment.references) ? payment.references : [];
  for (const raw of references) {
    if (!raw || typeof raw !== "object") continue;
    const reference = raw as Record<string, unknown>;
    if (reference.reference_doctype !== "Sales Invoice") continue;
    const name = String(reference.reference_name ?? "");
    const invoice = docs.get(name);
    if (!invoice) continue;
    const outstanding = Number(invoice.outstanding_amount ?? invoice.grand_total ?? 0);
    const allocated = Number(reference.allocated_amount ?? 0);
    invoice.outstanding_amount = Math.max(outstanding - allocated, 0);
    invoice.modified = new Date().toISOString();
  }
}

/** Accepts Frappe filters in object form (`{"email_id":"x"}`) or array form (`[["email_id","=","x"]]`). */
function parseFilters(raw: string | null): FilterClause[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (Array.isArray(parsed) && parsed.every((clause) => Array.isArray(clause))) {
    return parsed as FilterClause[];
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return Object.entries(parsed).map(([field, value]) => [field, "=", value]);
  }
  return [];
}

function matchesFilters(doc: Record<string, unknown>, filters: FilterClause[]): boolean {
  return filters.every(([field, operator, value]) => {
    const docValue = doc[field];
    if (operator === "=" || operator === "like") {
      if (operator === "like")
        return String(docValue ?? "")
          .toLowerCase()
          .includes(String(value ?? "").toLowerCase());
      return docValue === value || String(docValue ?? "") === String(value ?? "");
    }
    if (operator === "!=") return String(docValue ?? "") !== String(value ?? "");
    return true;
  });
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString("utf8");
    });
    req.on("end", () => {
      if (!data) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(data) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
