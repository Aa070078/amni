import { afterEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

import { prisma } from "@amni/db";
import { ErrorCode, MailTemplate } from "@amni/shared";
import type { MailService } from "../jobs/mail.service";
import { AuthService, type RequestMeta } from "./auth.service";

vi.mock("@amni/db", () => {
  const user = { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
  const company = { findUnique: vi.fn(), create: vi.fn() };
  const membership = { create: vi.fn() };
  const auditLog = { create: vi.fn(async () => ({})) };
  const session = { create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() };
  const emailVerification = { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() };
  const passwordReset = { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() };
  const prisma = {
    user,
    company,
    membership,
    auditLog,
    session,
    emailVerification,
    passwordReset,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };
  return { prisma };
});

const passwords = { hash: vi.fn(async () => "hash"), verify: vi.fn(async () => true) };
const tokens = {
  generateRefreshToken: vi.fn(() => "tok"),
  generateCsrfToken: vi.fn(() => "csrf"),
  signAccessToken: vi.fn(() => "jwt"),
  hashToken: vi.fn((t: string) => `h:${t}`),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
};
const mail = { enqueue: vi.fn(async () => undefined) } as unknown as MailService;

const meta: RequestMeta = { ip: "127.0.0.1", requestId: "req-1", userAgent: "vitest" };
const res = { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;

const createService = () => new AuthService(passwords as never, tokens as never, mail);

afterEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
});

const REGISTER_INPUT = {
  email: "ann@acme.co",
  password: "StrongPass1",
  firstName: "Ann",
  lastName: "Osei",
  companyName: "Acme",
  country: "GB",
};

describe("AuthService mail wiring", () => {
  it("enqueues verification + welcome on production registration", async () => {
    process.env.NODE_ENV = "production";
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: "user-1",
      email: "ann@acme.co",
      firstName: "Ann",
      lastName: null,
      status: "ACTIVE",
      isEmailVerified: false,
    });
    vi.mocked(prisma.company.create).mockResolvedValueOnce({ id: "company-1" });

    const service = createService();
    const result = await service.register(REGISTER_INPUT, res, meta);

    expect(result.user.email).toBe("ann@acme.co");
    expect(mail.enqueue).toHaveBeenCalledWith({
      template: MailTemplate.WELCOME,
      to: "ann@acme.co",
      firstName: "Ann",
      companyName: "Acme",
    });
    expect(mail.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ template: MailTemplate.VERIFICATION, to: "ann@acme.co", token: "tok" }),
    );
    expect(prisma.emailVerification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", tokenHash: "h:tok" }) }),
    );
  });

  it("does not enqueue emails for dev registration (auto-verified)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: "user-1",
      email: "ann@acme.co",
      firstName: "Ann",
      lastName: null,
      status: "ACTIVE",
      isEmailVerified: true,
    });
    vi.mocked(prisma.company.create).mockResolvedValueOnce({ id: "company-1" });

    const service = createService();
    await service.register(REGISTER_INPUT, res, meta);

    expect(mail.enqueue).not.toHaveBeenCalled();
    expect(prisma.emailVerification.create).not.toHaveBeenCalled();
  });

  it("enqueues a reset mail with the generated token when the user exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "user-1",
      email: "ann@acme.co",
      firstName: "Ann",
    });

    const service = createService();
    await service.requestPasswordReset({ email: "ann@acme.co" }, meta);

    expect(prisma.passwordReset.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", tokenHash: "h:tok" }) }),
    );
    expect(mail.enqueue).toHaveBeenCalledWith({
      template: MailTemplate.RESET,
      to: "ann@acme.co",
      firstName: "Ann",
      token: "tok",
    });
  });

  it("does not enqueue a reset mail when the email is unknown (uniform response)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(undefined);

    const service = createService();
    await service.requestPasswordReset({ email: "nobody@acme.co" }, meta);

    expect(prisma.passwordReset.create).not.toHaveBeenCalled();
    expect(mail.enqueue).not.toHaveBeenCalled();
  });

  it("throws a typed error when the reset token is invalid (no enqueue on reset)", async () => {
    vi.mocked(prisma.passwordReset.findUnique).mockResolvedValueOnce(undefined);

    const service = createService();
    await expect(service.resetPassword({ token: "bad", password: "NewStrong1" }, meta)).rejects.toMatchObject({
      code: ErrorCode.RESET_TOKEN_INVALID,
    });
    expect(mail.enqueue).not.toHaveBeenCalled();
  });
});
