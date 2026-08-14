import type { MockFrappeServer } from "./mock-frappe-server.js";

declare global {
  var __e2eMockServer: MockFrappeServer | undefined;
}

export default async function globalTeardown(): Promise<void> {
  try {
    await globalThis.__e2eMockServer?.close();
  } catch {
    // Best-effort: the runner process exits and releases the port either way.
  }
}
