import { PrismaClient } from "@amni/db";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { hash } from "@node-rs/argon2";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { startMockFrappeServer, type MockFrappeServer } from "./mock-frappe-server.js";

import { E2E_ENCRYPTION_KEY, MOCK_ERP_API_KEY, MOCK_ERP_API_SECRET } from "./constants.js";
import { redisPing } from "./redis.js";
import { writeE2EState } from "./state.js";

/** Mirrors PasswordService (apps/api/src/auth/password.service.ts) so seeded logins verify. */
const OWASP_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32, algorithm: 2 };

declare global {
  var __e2eMockServer: MockFrappeServer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const apiEnvPath = fileURLToPath(new URL("../../api/.env", import.meta.url));
  if (!process.env.DATABASE_URL && existsSync(apiEnvPath)) loadEnvFile(apiEnvPath);
  process.env.ENCRYPTION_KEY = E2E_ENCRYPTION_KEY;

  const suffix = Date.now().toString(36);
  const ownerEmail = `e2e.owner.${suffix}@amni.dev`;
  const ownerPassword = "E2eOwner12345!";
  const companyName = "E2E Acme Furniture";
  const companySlug = `e2e-acme-${suffix}`;

  let mock: MockFrappeServer;
  try {
    mock = await startMockFrappeServer({ apiKey: MOCK_ERP_API_KEY, apiSecret: MOCK_ERP_API_SECRET, docs: [] });
  } catch (err) {
    writeE2EState({
      skipAll: true,
      skipReason: `Mock ERP server failed to start: ${String(err)}`,
      redisAvailable: false,
      ownerEmail,
      ownerPassword,
      companyName,
      companySlug,
      mockUrl: "",
    });
    return;
  }
  globalThis.__e2eMockServer = mock;

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    await mock.close();
    await prisma.$disconnect();
    writeE2EState({
      skipAll: true,
      skipReason: `Postgres unreachable (run docker compose + pnpm db:migrate). ${String(err)}`,
      redisAvailable: false,
      ownerEmail,
      ownerPassword,
      companyName,
      companySlug,
      mockUrl: mock.url,
    });
    return;
  }

  const redisAvailable = await redisPing("127.0.0.1", 6379);

  try {
    const plan = await prisma.plan.upsert({
      where: { tier: "TRIAL" },
      update: {},
      create: { code: "trial", name: "Trial", tier: "TRIAL", price: 0, limits: {}, features: {} },
    });

    const passwordHash = await hash(ownerPassword, OWASP_OPTIONS);

    await prisma.membership.deleteMany({ where: { user: { email: ownerEmail } } });
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
    await prisma.company.deleteMany({ where: { slug: { startsWith: "e2e-" } } });

    const user = await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        firstName: "E2E",
        lastName: "Owner",
        status: "ACTIVE",
        isEmailVerified: true,
      },
    });

    const company = await prisma.company.create({
      data: { name: companyName, slug: companySlug, country: "US", status: "READY" },
    });

    await prisma.membership.create({
      data: { companyId: company.id, userId: user.id, platformRole: "OWNER" },
    });

    const tenant = await prisma.tenant.create({
      data: {
        companyId: company.id,
        siteName: companySlug,
        siteUrl: mock.url,
        status: "ACTIVE",
        hrmsInstalled: false,
        locale: {},
      },
    });

    await prisma.eRPInstance.create({
      data: {
        tenantId: tenant.id,
        host: mock.url,
        cluster: "default",
        health: "HEALTHY",
        serviceKeyCipher: encryptServiceSecret(serializeServiceCredentials(MOCK_ERP_API_KEY, MOCK_ERP_API_SECRET)),
      },
    });

    await prisma.subscription.create({
      data: { companyId: company.id, planId: plan.id, status: "ACTIVE" },
    });

    writeE2EState({
      skipAll: false,
      redisAvailable,
      ownerEmail,
      ownerPassword,
      companyName,
      companySlug,
      mockUrl: mock.url,
    });
  } catch (err) {
    writeE2EState({
      skipAll: true,
      skipReason: `Seed failed: ${String(err)}`,
      redisAvailable,
      ownerEmail,
      ownerPassword,
      companyName,
      companySlug,
      mockUrl: mock.url,
    });
  } finally {
    await prisma.$disconnect();
  }
}
