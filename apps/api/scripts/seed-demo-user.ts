import { hash } from "@node-rs/argon2";
import { prisma } from "@amni/db";

// Dev-only helper: seeds a demo admin you can log in with locally.
// Usage: pnpm --filter @amni/api exec tsx scripts/seed-demo-user.ts
const OWASP_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: 2, // Algorithm.Argon2id
};

const DEMO = {
  email: "demo@amni.dev",
  password: "demo12345",
  firstName: "Demo",
  lastName: "Admin",
  companyName: "Demo Co",
  slug: "demo-co",
};

async function main() {
  const passwordHash = await hash(DEMO.password, OWASP_OPTIONS);

  const { user, company } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: DEMO.email },
      update: { passwordHash, status: "ACTIVE", isEmailVerified: true, emailVerifiedAt: new Date() },
      create: {
        email: DEMO.email,
        passwordHash,
        firstName: DEMO.firstName,
        lastName: DEMO.lastName,
        status: "ACTIVE",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const company = await tx.company.upsert({
      where: { slug: DEMO.slug },
      update: { name: DEMO.companyName, country: "US", status: "READY" },
      create: { name: DEMO.companyName, slug: DEMO.slug, country: "US", status: "READY" },
    });

    await tx.membership.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: { platformRole: "OWNER" },
      create: { companyId: company.id, userId: user.id, platformRole: "OWNER" },
    });

    return { user, company };
  });

  console.log(`Demo user ready: ${user.email} / ${DEMO.password} (company ${company.name})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
