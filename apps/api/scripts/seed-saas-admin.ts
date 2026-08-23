import { hash } from "@node-rs/argon2";
import { prisma } from "@amni/db";

// Dev-only helper: seeds the pure SaaS platform admin account (no company
// membership). Lands on the /admin console after login.
// Usage: pnpm --filter @amni/api exec tsx scripts/seed-saas-admin.ts
const OWASP_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: 2, // Algorithm.Argon2id
};

const SAAS_ADMIN = {
  email: "owner@amni.com",
  password: "owner12345",
  firstName: "Platform",
  lastName: "Owner",
  isPlatformAdmin: true,
} as const;

async function main() {
  const passwordHash = await hash(SAAS_ADMIN.password, OWASP_OPTIONS);

  const user = await prisma.user.upsert({
    where: { email: SAAS_ADMIN.email },
    update: {
      passwordHash,
      status: "ACTIVE",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPlatformAdmin: SAAS_ADMIN.isPlatformAdmin,
    },
    create: {
      email: SAAS_ADMIN.email,
      passwordHash,
      firstName: SAAS_ADMIN.firstName,
      lastName: SAAS_ADMIN.lastName,
      status: "ACTIVE",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPlatformAdmin: SAAS_ADMIN.isPlatformAdmin,
    },
  });

  await prisma.membership.deleteMany({ where: { userId: user.id } });

  console.log(`SaaS admin ready: ${SAAS_ADMIN.email} / ${SAAS_ADMIN.password} (platform admin, no company)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
