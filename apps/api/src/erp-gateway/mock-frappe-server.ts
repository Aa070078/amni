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

    const resource = url.pathname.startsWith(RESOURCE_PREFIX)
      ? url.pathname.slice(RESOURCE_PREFIX.length).split("/").filter(Boolean)
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
            const limit = Number(url.searchParams.get("limit_page_length") ?? 20);
            const start = Number(url.searchParams.get("start") ?? 0);
            const all = [...docs.values()];
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
          const docName = String(body?.name ?? `${doctype}-${nextName++}`);
          const doc = { name: docName, ...(body ?? {}) };
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

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Mock ERP server failed to bind");
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    docs,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
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
