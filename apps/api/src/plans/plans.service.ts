import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import { catalogPlanSchema, type CatalogPlan, type PlansListResponse } from "@amni/shared";

/** DB-backed plan (id + shared contract). */
export type PlanRecord = CatalogPlan & { id: string };

const toContract = (row: {
  id: string;
  code: string;
  name: string;
  tier: string;
  price: { toNumber(): number };
  limits: unknown;
  features: unknown;
}): PlanRecord => {
  const plan = catalogPlanSchema.parse({
    code: row.code,
    name: row.name,
    tier: row.tier.toLowerCase() as CatalogPlan["tier"],
    priceMonthly: row.price.toNumber(),
    limits: row.limits as Record<string, unknown>,
    features: row.features as Record<string, unknown>,
  });
  return { ...plan, id: row.id };
};

@Injectable()
export class PlansService {
  async list(): Promise<PlansListResponse> {
    const rows = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
    return { items: rows.map(toContract) };
  }

  async findByCode(code: string): Promise<PlanRecord | null> {
    const row = await prisma.plan.findUnique({ where: { code } });
    if (!row || !row.isActive) return null;
    return toContract(row);
  }
}
