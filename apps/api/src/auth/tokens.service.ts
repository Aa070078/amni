import { Injectable, type OnModuleInit } from "@nestjs/common";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { CookieOptions, Response } from "express";

const ACCESS_COOKIE = "amni_access";
const REFRESH_COOKIE = "amni_refresh";
const CSRF_COOKIE = "amni_csrf";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: "access";
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

@Injectable()
export class TokensService implements OnModuleInit {
  private accessSecret!: string;
  private accessTtlSeconds!: number;
  private refreshTtlDays!: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const secret = this.config.get<string>("ACCESS_TOKEN_SECRET");
    if (!secret || secret.length < 32) {
      throw new Error("ACCESS_TOKEN_SECRET must be set to at least 32 characters");
    }
    this.accessSecret = secret;
    this.accessTtlSeconds = Number(this.config.get("ACCESS_TOKEN_TTL_SECONDS") ?? 900);
    this.refreshTtlDays = Number(this.config.get("REFRESH_TOKEN_TTL_DAYS") ?? 30);
  }

  signAccessToken(payload: AccessTokenPayload): string {
    const options: SignOptions = {
      algorithm: "HS256",
      expiresIn: this.accessTtlSeconds,
    };
    return jwt.sign(payload, this.accessSecret, options);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, this.accessSecret, { algorithms: ["HS256"] }) as JwtPayload & {
      type: "access";
    };
    if (payload.type !== "access" || typeof payload.sub !== "string" || typeof payload.email !== "string") {
      throw new Error("unexpected token payload");
    }
    return { sub: payload.sub, email: payload.email, type: "access" };
  }

  generateRefreshToken(): string {
    return randomBytes(32).toString("base64url");
  }

  generateCsrfToken(): string {
    return randomBytes(16).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    };
  }

  setAuthCookies(res: Response, tokens: Tokens) {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.baseCookieOptions(),
      maxAge: this.accessTtlSeconds * 1000,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.baseCookieOptions(),
      maxAge: this.refreshTtlDays * 24 * 60 * 60 * 1000,
    });
    res.cookie(CSRF_COOKIE, tokens.csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, this.baseCookieOptions());
    res.clearCookie(REFRESH_COOKIE, this.baseCookieOptions());
    res.clearCookie(CSRF_COOKIE, { ...this.baseCookieOptions(), httpOnly: false });
  }
}

export { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE };
