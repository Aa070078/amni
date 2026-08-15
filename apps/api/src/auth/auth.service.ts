import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import { ErrorCode, MailTemplate } from "@amni/shared";
import type {
  ChangePasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@amni/shared";
import type { Response } from "express";

import { ApiException } from "../common/api.exception";
// Value imports required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PasswordService } from "./password.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { TokensService } from "./tokens.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MailService } from "../jobs/mail.service";

const MAX_FAILED_LOGINS = 10;
const LOCKOUT_BASE_MS = 60_000;
const LOCKOUT_CAP_MS = 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: string;
  isEmailVerified: boolean;
  isPlatformAdmin: boolean;
}

const USER_PUBLIC_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  isEmailVerified: true,
  isPlatformAdmin: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
  ) {}

  async register(input: RegisterInput, res: Response, meta: RequestMeta): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ApiException({
        code: ErrorCode.EMAIL_ALREADY_REGISTERED,
        status: 409,
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await this.passwords.hash(input.password);
    const isDev = process.env.NODE_ENV !== "production";
    const slug = await this.uniqueCompanySlug(input.companyName);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          isEmailVerified: isDev,
          emailVerifiedAt: isDev ? new Date() : null,
        },
        select: USER_PUBLIC_FIELDS,
      });

      const company = await tx.company.create({
        data: {
          name: input.companyName,
          slug,
          country: input.country,
          status: "ONBOARDING",
        },
        select: { id: true },
      });

      await tx.membership.create({
        data: { companyId: company.id, userId: created.id, platformRole: "OWNER" },
      });

      await tx.auditLog.create({
        data: {
          actorId: created.id,
          actorEmail: created.email,
          action: "company.create",
          resourceType: "company",
          resourceId: company.id,
          ip: meta.ip,
          requestId: meta.requestId,
        },
      });

      return created;
    });

    if (!isDev) {
      await this.createEmailVerification(user.id, user.email, user.firstName);
      await this.mail.enqueue({
        template: MailTemplate.WELCOME,
        to: user.email,
        firstName: user.firstName,
        companyName: input.companyName,
      });
    }

    await this.issueSession(user.id, user.email, res, meta, "auth.register");

    return { user };
  }

  async login(input: LoginInput, res: Response, meta: RequestMeta): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    const now = Date.now();
    if (user?.lockedUntil && user.lockedUntil.getTime() > now) {
      throw new ApiException({
        code: ErrorCode.ACCOUNT_LOCKED,
        status: 423,
        message: "Account temporarily locked due to too many failed attempts",
        retryAfterMs: user.lockedUntil.getTime() - now,
      });
    }

    const passwordOk = user ? await this.passwords.verify(user.passwordHash, input.password) : false;
    if (!user || !passwordOk) {
      if (user) {
        await this.recordFailedLogin(user.id);
      }
      // Uniform response prevents user enumeration.
      throw new ApiException({
        code: ErrorCode.INVALID_CREDENTIALS,
        status: 401,
        message: "Invalid email or password",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.issueSession(user.id, user.email, res, meta, "auth.login");

    return { user: toPublicUser(user) };
  }

  async refresh(input: RefreshInput | undefined, res: Response, meta: RequestMeta): Promise<AuthResult> {
    const refreshToken = input?.refreshToken ?? meta.refreshCookie;
    if (!refreshToken) {
      throw new ApiException({ code: ErrorCode.INVALID_REFRESH, status: 401, message: "Missing refresh token" });
    }

    const tokenHash = this.tokens.hashToken(refreshToken);
    const session = await prisma.session.findFirst({ where: { refreshTokenHash: tokenHash } });
    if (!session) {
      throw new ApiException({ code: ErrorCode.INVALID_REFRESH, status: 401, message: "Invalid refresh token" });
    }

    const now = Date.now();
    if (session.revokedAt) {
      // Refresh-token reuse: revoke the whole session family.
      await prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new ApiException({
        code: ErrorCode.SESSION_REVOKED,
        status: 401,
        message: "Session has been revoked",
      });
    }
    if (session.expiresAt.getTime() <= now) {
      throw new ApiException({ code: ErrorCode.SESSION_EXPIRED, status: 401, message: "Session has expired" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: USER_PUBLIC_FIELDS,
    });
    if (!user || user.status !== "ACTIVE") {
      throw new ApiException({ code: ErrorCode.UNAUTHORIZED, status: 401, message: "Account unavailable" });
    }

    // Rotate: revoke old session, mint a fresh refresh token.
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const refreshTokenNext = this.tokens.generateRefreshToken();
    const accessToken = this.tokens.signAccessToken({ sub: user.id, email: user.email, type: "access" });
    const csrfToken = this.tokens.generateCsrfToken();
    const expiresAt = new Date(now + this.refreshTtlMs());

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.tokens.hashToken(refreshTokenNext),
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt,
      },
    });

    this.tokens.setAuthCookies(res, { accessToken, refreshToken: refreshTokenNext, csrfToken });

    return { user };
  }

  async logout(res: Response, meta: RequestMeta): Promise<void> {
    const refreshToken = meta.refreshCookie;
    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshTokenHash: this.tokens.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.tokens.clearAuthCookies(res);
    await this.audit(undefined, "auth.logout", meta);
  }

  async verifyEmail(input: VerifyEmailInput, meta: RequestMeta): Promise<{ verified: boolean }> {
    const tokenHash = this.tokens.hashToken(input.token);
    const verification = await prisma.emailVerification.findUnique({ where: { tokenHash } });
    if (!verification || verification.usedAt || verification.expiresAt.getTime() <= Date.now()) {
      throw new ApiException({
        code: ErrorCode.VERIFY_TOKEN_INVALID,
        status: 400,
        message: "Verification token is invalid or expired",
      });
    }

    await prisma.$transaction([
      prisma.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
      prisma.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);

    await this.audit(verification.userId, "auth.verify_email", meta);
    return { verified: true };
  }

  async requestPasswordReset(input: RequestPasswordResetInput, meta: RequestMeta): Promise<void> {
    // Uniform response: never reveal whether the email exists.
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user) {
      const token = this.tokens.generateRefreshToken();
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: this.tokens.hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      await this.mail.enqueue({
        template: MailTemplate.RESET,
        to: user.email,
        firstName: user.firstName,
        token,
      });
      await this.audit(user.id, "auth.request_reset", meta);
    }
  }

  async resetPassword(input: ResetPasswordInput, meta: RequestMeta): Promise<void> {
    const tokenHash = this.tokens.hashToken(input.token);
    const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      throw new ApiException({
        code: ErrorCode.RESET_TOKEN_INVALID,
        status: 400,
        message: "Reset token is invalid or expired",
      });
    }

    const passwordHash = await this.passwords.hash(input.password);
    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }),
      prisma.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit(reset.userId, "auth.reset_password", meta);
  }

  async changePassword(input: ChangePasswordInput, userId: string, meta: RequestMeta): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
    if (!user) {
      throw new ApiException({ code: ErrorCode.UNAUTHORIZED, status: 401, message: "Unauthorized" });
    }
    const ok = await this.passwords.verify(user.passwordHash, input.currentPassword);
    if (!ok) {
      throw new ApiException({ code: ErrorCode.INVALID_CREDENTIALS, status: 401, message: "Current password is incorrect" });
    }

    const passwordHash = await this.passwords.hash(input.newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.audit(userId, "auth.change_password", meta);
  }

  async me(userId: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_FIELDS,
    });
    if (!user) {
      throw new ApiException({ code: ErrorCode.UNAUTHORIZED, status: 401, message: "Account unavailable" });
    }
    return { user: toPublicUser(user) };
  }

  private async issueSession(userId: string, email: string, res: Response, meta: RequestMeta, action: string) {
    const refreshToken = this.tokens.generateRefreshToken();
    const accessToken = this.tokens.signAccessToken({ sub: userId, email, type: "access" });
    const csrfToken = this.tokens.generateCsrfToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    await prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.tokens.hashToken(refreshToken),
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt,
      },
    });

    this.tokens.setAuthCookies(res, { accessToken, refreshToken, csrfToken });
    await this.audit(userId, action, meta);
  }

  private refreshTtlMs(): number {
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
    return days * 24 * 60 * 60 * 1000;
  }

  private async uniqueCompanySlug(companyName: string): Promise<string> {
    const base = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
    const candidate = base || "company";
    const existing = await prisma.company.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    const suffix = randomUUID().slice(0, 8);
    return `${candidate}-${suffix}`;
  }

  private async recordFailedLogin(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { failedLoginCount: true } });
    if (!user) return;
    const count = user.failedLoginCount + 1;
    const lockedUntil =
      count >= MAX_FAILED_LOGINS
        ? new Date(Date.now() + Math.min(LOCKOUT_BASE_MS * 2 ** (count - MAX_FAILED_LOGINS), LOCKOUT_CAP_MS))
        : null;
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: count, lockedUntil },
    });
  }

  private async createEmailVerification(userId: string, email: string, firstName: string) {
    const token = this.tokens.generateRefreshToken();
    await prisma.emailVerification.create({
      data: {
        userId,
        tokenHash: this.tokens.hashToken(token),
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    });
    await this.mail.enqueue({
      template: MailTemplate.VERIFICATION,
      to: email,
      firstName,
      token,
    });
  }

  private async audit(actorId: string | undefined, action: string, meta: RequestMeta) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        resourceType: "auth",
        ip: meta.ip,
        requestId: meta.requestId,
      },
    }).catch(() => undefined);
  }
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  refreshCookie?: string;
  requestId?: string;
}

function toPublicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: string;
  isEmailVerified: boolean;
  isPlatformAdmin: boolean;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}
