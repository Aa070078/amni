import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "./errors.js";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = "amni:v1:";

/**
 * At-rest encryption for per-tenant ERP service credentials.
 *
 * The platform never stores tenant service keys in plaintext: an ERPInstance
 * holds a single ciphertext (JSON of apiKey/apiSecret) encrypted with
 * AES-256-GCM using the platform master key from ENCRYPTION_KEY. Each record
 * uses a fresh random IV + auth tag, so equal plaintexts never share cipher.
 */
export function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new ErpError(ErrorCode.INTERNAL, "ENCRYPTION_KEY is not configured");
  }
  const key = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "utf8");
  if (key.length !== 32) {
    throw new ErpError(
      ErrorCode.INTERNAL,
      "ENCRYPTION_KEY must be 32 bytes (64 hex chars or a 32-char string)",
    );
  }
  return key;
}

export function encryptServiceSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptServiceSecret(payload: string): string {
  if (!payload.startsWith(PREFIX)) {
    throw new ErpError(ErrorCode.ERP_UNAUTHORIZED, "Unsupported or malformed service secret");
  }
  const [ivB64, tagB64, dataB64] = payload.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || !dataB64 || Buffer.from(tagB64, "base64url").length !== TAG_LENGTH) {
    throw new ErpError(ErrorCode.ERP_UNAUTHORIZED, "Malformed service secret");
  }
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  try {
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    throw new ErpError(ErrorCode.ERP_UNAUTHORIZED, "Failed to decrypt service secret");
  }
}

export function serializeServiceCredentials(apiKey: string, apiSecret: string): string {
  return JSON.stringify({ apiKey, apiSecret });
}

export function parseServiceCredentials(payload: string): { apiKey: string; apiSecret: string } {
  let parsed: { apiKey?: unknown; apiSecret?: unknown };
  try {
    parsed = JSON.parse(payload) as { apiKey?: unknown; apiSecret?: unknown };
  } catch {
    throw new ErpError(ErrorCode.ERP_UNAUTHORIZED, "Malformed service credentials");
  }
  if (typeof parsed.apiKey !== "string" || typeof parsed.apiSecret !== "string" || !parsed.apiKey || !parsed.apiSecret) {
    throw new ErpError(ErrorCode.ERP_UNAUTHORIZED, "Malformed service credentials");
  }
  return { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret };
}
