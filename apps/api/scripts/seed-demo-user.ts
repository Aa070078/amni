import { hash } from "@node-rs/argon2";
import { prisma } from "@amni/db";

// Dev-only helper: seeds demo accounts you can log in with locally.
// Usage: pnpm --filter @amni/api exec tsx scripts/seed-demo-user.ts
const OWASP_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: 2, // Algorithm.Argon2id
};

const COMPANY = { name: "Demo Co", slug: "demo-co", country: "US" };

const DEMO_USERS = [
  {
    email: "demo@amni.dev",
    password: "demo12345",
    firstName: "Demo",
    lastName: "Admin",
    platformRole: "OWNER",
  },
  {
    email: "member@amni.dev",
    password: "member12345",
    firstName: "Demo",
    lastName: "Member",
    platformRole: "MEMBER",
  },
] as const;

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: COMPANY.slug },
    update: { name: COMPANY.name, country: COMPANY.country, status: "READY" },
    create: { name: COMPANY.name, slug: COMPANY.slug, country: COMPANY.country, status: "READY" },
  });

  for (const demo of DEMO_USERS) {
    const passwordHash = await hash(demo.password, OWASP_OPTIONS);

    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { passwordHash, status: "ACTIVE", isEmailVerified: true, emailVerifiedAt: new Date() },
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
