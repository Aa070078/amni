import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpClient } from "./client.js";

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

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function makeClient(overrides: Partial<ConstructorParameters<typeof ErpClient>[0]> = {}) {
  return new ErpClient({ baseUrl: BASE_URL, apiKey: API_KEY, apiSecret: API_SECRET, allowHost: "acme.example.com", ...overrides });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ErpClient security", () => {
  it("rejects requests to hosts outside allowHost without calling fetch", async () => {
    const { fetchMock } = installFetch(() => jsonResponse(200, {}));
    const client = makeClient({ baseUrl: "https://evil.example", allowHost: "good.example" });
    await expect(client.list("Customer")).rejects.toMatchObject({
      name: "ErpError",
      code: ErrorCode.ERP_SSRF_BLOCKED,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ErpClient resource CRUD", () => {
  it("lists a doctype with serialized filters and pagination", async () => {
    const { fetchMock, lastUrl, lastInit } = installFetch(() =>
      jsonResponse(200, { data: [{ name: "C-1" }, { name: "C-2" }] }),
    );
    const client = makeClient();
    const result = await client.list<{ name: string }>("Customer", {
      filters: { disabled: 0 },
      limitPageLength: 2,
      start: 4,
    });

    expect(String(lastUrl())).toBe(
      `${BASE_URL}/api/v1/resource/Customer?filters=${encodeURIComponent(JSON.stringify({ disabled: 0 }))}&limit_page_length=2&start=4`,
    );
    expect(lastInit().headers).toMatchObject({ Authorization: `token ${API_KEY}:${API_SECRET}` });
    expect(result.items).toEqual([{ name: "C-1" }, { name: "C-2" }]);
    expect(result.hasMore).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses the last page of a list as hasMore=false", async () => {
    installFetch(() => jsonResponse(200, { data: [{ name: "C-1" }] }));
    const client = makeClient();
    const result = await client.list("Customer", { limitPageLength: 20 });
    expect(result.hasMore).toBe(false);
  });

  it("always sends a bounded list page length", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: [] }));
    const client = makeClient();
    await client.list("Customer", { limitPageLength: 0 });
    expect(lastUrl().searchParams.get("limit_page_length")).toBe("100");
    await client.list("Customer", { limitPageLength: 500 });
    expect(lastUrl().searchParams.get("limit_page_length")).toBe("100");
  });

  it("gets a single resource by name", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "C-1", customer_name: "Acme" } }));
    const client = makeClient();
    const item = await client.get<{ name: string; customer_name: string }>("Customer", "C-1");
    expect(item).toEqual({ name: "C-1", customer_name: "Acme" });
    expect(String(lastUrl())).toBe(`${BASE_URL}/api/v1/resource/Customer/C-1`);
  });

  it("create, update, submit, cancel and delete hit the right endpoints", async () => {
    const { fetchMock, lastUrl, lastInit } = installFetch(() => jsonResponse(200, { data: { name: "C-1" } }));
    const client = makeClient();

    await client.create("Customer", { customer_name: "Acme" });
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
    expect(JSON.parse(String(lastInit().body))).toEqual({ customer_name: "Acme" });

    await client.update("Customer", "C-1", { customer_name: "Acme Ltd" });
    expect(String(lastUrl())).toBe(`${BASE_URL}/api/v1/resource/Customer/C-1`);
    expect(fetchMock.mock.calls[1]![1]!.method).toBe("PUT");

    await client.submit("Customer", "C-1");
    expect(String(lastUrl())).toBe(`${BASE_URL}/api/v1/resource/Customer/C-1?action=submit`);

    await client.cancel("Customer", "C-1");
    expect(String(lastUrl())).toBe(`${BASE_URL}/api/v1/resource/Customer/C-1?action=cancel`);

    await client.delete("Customer", "C-1");
    expect(fetchMock.mock.calls[4]![1]!.method).toBe("DELETE");
  });

  it("calls a whitelisted method and returns its message", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { message: { name: "SO-1" } }));
    const client = makeClient();
    const result = await client.call<{ name: string }>("some.whitelisted.method", { doc: { x: 1 } });
    expect(result).toEqual({ name: "SO-1" });
    expect(String(lastUrl())).toBe(`${BASE_URL}/api/v1/method/some.whitelisted.method`);
  });

  it("queries one bounded native page through the allow-listed bridge", async () => {
    const { lastUrl, lastInit } = installFetch(() => jsonResponse(200, { message: { items: [{ name: "C-1" }], total: 42 } }));
    const client = makeClient();
    const result = await client.query<{ name: string }>("Customer", { q: "acme", start: 20, pageLength: 500, orderBy: "modified desc" });
    expect(result).toEqual({ items: [{ name: "C-1" }], total: 42 });
    expect(String(lastUrl())).toBe(`${BASE_URL}/api/v1/method/amni_bridge.api.query_native_records`);
    expect(JSON.parse(String(lastInit().body))).toMatchObject({ doctype: "Customer", q: "acme", start: 20, page_length: 100 });
  });
});

describe("ErpClient error mapping", () => {
  it("maps 401 to ERP_UNAUTHORIZED", async () => {
    installFetch(() => jsonResponse(401, { message: "Not Permitted" }));
    const client = makeClient();
    await expect(client.get("Customer", "C-1")).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
      status: 401,
    });
  });

  it("maps 417 with ValidationError to ERP_VALIDATION", async () => {
    installFetch(() =>
      jsonResponse(417, { exc_type: "ValidationError", exception: "Item disabled", _server_messages: [] }),
    );
    const client = makeClient();
    await expect(client.create("SalesOrder", {})).rejects.toMatchObject({
      code: ErrorCode.ERP_VALIDATION,
    });
  });

  it("retries transient 500s and succeeds", async () => {
    const { fetchMock } = installFetch(() => jsonResponse(200, { data: { name: "C-1" } }));
    fetchMock.mockImplementationOnce(() => jsonResponse(500, { message: "boom" }));
    const client = makeClient({ maxRetries: 2 });
    const item = await client.get("Customer", "C-1");
    expect(item).toEqual({ name: "C-1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces ERP_UNREACHABLE after exhausting network retries", async () => {
    const { fetchMock } = installFetch(() => {
      throw new TypeError("fetch failed");
    });
    const client = makeClient({ maxRetries: 1 });
    await expect(client.list("Customer")).rejects.toMatchObject({
      code: ErrorCode.ERP_UNREACHABLE,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("ErpClient session auth", () => {
  it("logs in with credentials and returns the session user", async () => {
    let loginInit: RequestInit | undefined;
    installFetch((input, init) => {
      if (String(input).endsWith("/method/login")) {
        loginInit = init;
        return jsonResponse(200, { message: "Logged In" }, { "set-cookie": "sid=abc123; path=/; httponly" });
      }
      return jsonResponse(200, { message: "Administrator" });
    });

    const client = makeClient();
    const login = await client.login("admin@acme.com", "pwd");

    expect(login).toEqual({ sid: "abc123", loggedUser: "Administrator" });
    expect(JSON.parse(String(loginInit?.body))).toEqual({ usr: "admin@acme.com", pwd: "pwd" });
    expect(loginInit?.headers).not.toHaveProperty("Authorization");
  });

  it("sends the session cookie on session-authed calls", async () => {
    let loggedUserInit: RequestInit | undefined;
    installFetch((_input, init) => {
      if (String(_input).includes("get_logged_user")) {
        loggedUserInit = init;
        return jsonResponse(200, { message: "Administrator" });
      }
      return jsonResponse(200, { message: "Logged In" }, { "set-cookie": "sid=abc123; path=/; httponly" });
    });
    const client = makeClient();
    await client.login("admin@acme.com", "pwd");
    await client.getLoggedUser();
    expect(loggedUserInit?.headers).toMatchObject({ Cookie: "sid=abc123" });
  });

  it("throws ERP_UNAUTHORIZED when login rejects credentials", async () => {
    installFetch(() => jsonResponse(401, { message: "Incorrect password" }));
    const client = makeClient();
    await expect(client.login("admin@acme.com", "bad")).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
    });
  });

  it("throws ERP_UNAUTHORIZED when no session is issued", async () => {
    installFetch(() => jsonResponse(200, { message: "Logged In" }));
    const client = makeClient();
    await expect(client.login("admin@acme.com", "pwd")).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
    });
  });

  it("clears the session on logout", async () => {
    let sawCookie = false;
    installFetch((_input, init) => {
      if (String(_input).includes("logout")) {
        sawCookie = (init.headers as Record<string, string>).Cookie === "sid=abc123";
        return jsonResponse(200, { message: "Logged Out" });
      }
      return jsonResponse(200, { message: "Logged In" }, { "set-cookie": "sid=abc123; path=/; httponly" });
    });
    const client = makeClient();
    await client.login("admin@acme.com", "pwd");
    await client.logout();
    expect(sawCookie).toBe(true);
  });
});

describe("ErpClient request correlation", () => {
  it("forwards the platform requestId", async () => {
    const { lastInit } = installFetch(() => jsonResponse(200, { data: [] }));
    const client = makeClient({ requestId: "req-123" });
    await client.list("Customer");
    expect(lastInit().headers).toMatchObject({ "X-Frappe-Request-Id": "req-123" });
  });
});
