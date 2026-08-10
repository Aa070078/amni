import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";
import {
  decryptServiceSecret,
  encryptServiceSecret,
  parseServiceCredentials,
  serializeServiceCredentials,
} from "./crypto.js";
import { ErpError } from "./errors.js";

const HEX_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

beforeEach(() => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe("encryptServiceSecret", () => {
  it("round-trips a secret with a 64-hex key", () => {
    const secret = JSON.stringify({ apiKey: "k", apiSecret: "s" });
    const cipher = encryptServiceSecret(secret);
    expect(cipher.startsWith("amni:v1:")).toBe(true);
    expect(decryptServiceSecret(cipher)).toBe(secret);
  });

  it("round-trips with a 32-char key", () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const secret = "plain-credentials";
    expect(decryptServiceSecret(encryptServiceSecret(secret))).toBe(secret);
  });

  it("uses a fresh IV so equal plaintexts never share ciphertext", () => {
    const a = encryptServiceSecret("same");
    const b = encryptServiceSecret("same");
    expect(a).not.toBe(b);
  });

  it("rejects a missing key", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptServiceSecret("x")).toThrow(ErpError);
    expect(() => encryptServiceSecret("x")).toThrow(/ENCRYPTION_KEY/);
  });

  it("rejects a wrong-length key", () => {
    process.env.ENCRYPTION_KEY = "too-short";
    expect(() => encryptServiceSecret("x")).toThrow(ErpError);
  });
});

describe("decryptServiceSecret", () => {
  it("fails to decrypt with the wrong key", () => {
    const cipher = encryptServiceSecret("secret");
    process.env.ENCRYPTION_KEY = "ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100";
    expect(() => decryptServiceSecret(cipher)).toThrow(ErpError);
  });

  it("rejects tampered ciphertext", () => {
    const cipher = encryptServiceSecret("secret");
    const parts = cipher.split(":");
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${Buffer.from("corrupted").toString("base64url")}`;
    expect(() => decryptServiceSecret(tampered)).toThrow(ErpError);
  });

  it("rejects unknown prefixes", () => {
    expect(() => decryptServiceSecret("plain:stuff")).toThrow(ErpError);
  });
});

describe("serializeServiceCredentials", () => {
  it("round-trips credentials", () => {
    const payload = serializeServiceCredentials("api-key", "api-secret");
    expect(parseServiceCredentials(payload)).toEqual({ apiKey: "api-key", apiSecret: "api-secret" });
  });

  it("rejects non-JSON payloads", () => {
    expect(() => parseServiceCredentials("not json")).toThrow(ErpError);
  });

  it("rejects missing or empty credential fields", () => {
    expect(() => parseServiceCredentials("{}")).toThrow(ErpError);
    expect(() => parseServiceCredentials(JSON.stringify({ apiKey: "", apiSecret: "s" }))).toThrow(ErpError);
  });
});

describe("getEncryptionKey", () => {
  it("throws ERP code INTERNAL for config problems", () => {
    delete process.env.ENCRYPTION_KEY;
    try {
      encryptServiceSecret("x");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ErpError);
      expect((err as ErpError).code).toBe(ErrorCode.INTERNAL);
    }
  });
});
