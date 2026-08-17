import { hash } from "@node-rs/argon2";
import { prisma } from "@amni/db";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";

// Dev-only helper (M7-002): seeds the demo company Demo Co with an ACTIVE
// tenant + ERP instance + TRIAL subscription so the company dashboard works
// locally. Idempotent — safe to re-run.
// Usage: pnpm --filter @amni/api exec tsx --env-file=.env.local scripts/seed-demo-company.ts
// ENCRYPTION_KEY must be set and match the running API/worker, or the seeded
// serviceKeyCipher cannot be decrypted at runtime.
const OWASP_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: 2, // Algorithm.Argon2id
};

const COMPANY = { name: "Demo Co", slug: "demo-co", country: "US" };

// The tenant ERP runs on the local bench (frappe_docker) at :8080. The default
// credentials are the shared test-harness fixture; point at a live bench by
// setting DEMO_ERP_API_KEY / DEMO_ERP_API_SECRET (e.g. from generate_keys on
// the bench's integration service account).
const ERP = {
  host: process.env.DEMO_ERP_HOST ?? "http://localhost:8080",
  apiKey: process.env.DEMO_ERP_API_KEY ?? "demo-service-account",
  apiSecret: process.env.DEMO_ERP_API_SECRET ?? "demo-secret-5b2f1c8a",
};

const TRIAL_DAYS = 14;

const DEMO_USERS = [
  {
    email: "admin@demo.amni",
    password: "admin12345",
    firstName: "Demo",
    lastName: "Admin",
    platformRole: "OWNER",
  },
  {
    email: "member@demo.amni",
    password: "member12345",
    firstName: "Demo",
    lastName: "Member",
    platformRole: "MEMBER",
  },
] as const;

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      "ENCRYPTION_KEY is not set — run with --env-file=.env.local and keep it in sync with the running API",
    );
  }

  const company = await prisma.company.upsert({
    where: { slug: COMPANY.slug },
    update: { name: COMPANY.name, country: COMPANY.country, status: "READY" },
    create: { name: COMPANY.name, slug: COMPANY.slug, country: COMPANY.country, status: "READY" },
  });

  const tenant = await prisma.tenant.upsert({
    where: { companyId: company.id },
    update: { siteName: COMPANY.slug, siteUrl: ERP.host, status: "ACTIVE", planTier: "TRIAL" },
    create: {
      companyId: company.id,
      siteName: COMPANY.slug,
      siteUrl: ERP.host,
      status: "ACTIVE",
      planTier: "TRIAL",
      locale: {},
    },
  });

  const serviceKeyCipher = encryptServiceSecret(serializeServiceCredentials(ERP.apiKey, ERP.apiSecret));
  await prisma.eRPInstance.upsert({
    where: { tenantId: tenant.id },
    update: { host: ERP.host, health: "HEALTHY", serviceKeyCipher },
    create: { tenantId: tenant.id, host: ERP.host, health: "HEALTHY", serviceKeyCipher },
  });

  const plan = await prisma.plan.upsert({
    where: { tier: "TRIAL" },
    update: {},
    create: { code: "trial", name: "Trial", tier: "TRIAL", price: 0, limits: {}, features: {} },
  });

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
  const existingSubscription = await prisma.subscription.findFirst({ where: { companyId: company.id } });
  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { planId: plan.id, status: "TRIAL", startsAt: new Date(), trialEndsAt },
    });
  } else {
    await prisma.subscription.create({
      data: { companyId: company.id, planId: plan.id, status: "TRIAL", startsAt: new Date(), trialEndsAt },
    });
  }

  for (const demo of DEMO_USERS) {
    const passwordHash = await hash(demo.password, OWASP_OPTIONS);

    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        passwordHash,
        firstName: demo.firstName,
        lastName: demo.lastName,
        status: "ACTIVE",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      create: {
        email: demo.email,
        passwordHash,
        firstName: demo.firstName,
        lastName: demo.lastName,
        status: "ACTIVE",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.membership.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: { platformRole: demo.platformRole },
      create: { companyId: company.id, userId: user.id, platformRole: demo.platformRole },
    });

    console.log(`Demo user ready: ${demo.email} / ${demo.password} (${demo.platformRole})`);
  }

  console.log(`Demo Co ready: tenant ACTIVE (${tenant.siteName}) → ${ERP.host} · plan TRIAL (${TRIAL_DAYS} days)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
