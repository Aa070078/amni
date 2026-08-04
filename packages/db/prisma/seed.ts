import { prisma } from "../src/client";

/**
 * Dev-only seed: base plans + a demo admin. Idempotent — safe to re-run.
 */
async function main() {
  const plans = [
    {
      code: "trial",
      tier: "TRIAL",
      name: "Trial",
      price: 0,
      limits: { users: 5, companies: 1, storageGb: 1, importsPerMonth: 3 },
      features: { erpBackup: false, customDomain: false, apiAccess: true },
    },
    {
      code: "starter",
      tier: "STARTER",
      name: "Starter",
      price: 49,
      limits: { users: 10, companies: 1, storageGb: 5, importsPerMonth: 20 },
      features: { erpBackup: true, customDomain: false, apiAccess: true },
    },
    {
      code: "growth",
      tier: "GROWTH",
      name: "Growth",
      price: 149,
      limits: { users: 50, companies: 1, storageGb: 25, importsPerMonth: 200 },
      features: { erpBackup: true, customDomain: true, apiAccess: true },
    },
    {
      code: "scale",
      tier: "SCALE",
      name: "Scale",
      price: 499,
      limits: { users: 500, companies: 1, storageGb: 100, importsPerMonth: 1000 },
      features: { erpBackup: true, customDomain: true, apiAccess: true },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier as never },
      update: { name: plan.name, price: plan.price, limits: plan.limits, features: plan.features },
      create: { code: plan.code, tier: plan.tier as never, name: plan.name, price: plan.price, limits: plan.limits, features: plan.features },
    });
  }

  console.log(`Seeded ${plans.length} plans.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
