import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface E2EState {
  skipAll: boolean;
  skipReason?: string;
  redisAvailable: boolean;
  ownerEmail: string;
  ownerPassword: string;
  companyName: string;
  companySlug: string;
  mockUrl: string;
}

const STATE_FILE = fileURLToPath(new URL("../playwright/.e2e-state.json", import.meta.url));

export function writeE2EState(state: E2EState): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function readE2EState(): E2EState {
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as E2EState;
}
