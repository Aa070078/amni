import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardService } from "./wizard.service";

const mocks = vi.hoisted(() => ({
  draftFind: vi.fn(),
  draftUpsert: vi.fn(),
  draftUpdate: vi.fn(),
  userFind: vi.fn(),
  membershipFind: vi.fn(),
  companyUpdate: vi.fn(),
  tenantUpsert: vi.fn(),
  subscriptionFind: vi.fn(),
  subscriptionCreate: vi.fn(),
  subscriptionUpdate: vi.fn(),
}));

vi.mock("@amni/db", () => ({
  Prisma: {},
  prisma: {
    onboardingDraft: { findUnique: mocks.draftFind, upsert: mocks.draftUpsert, update: mocks.draftUpdate },
    user: { findUnique: mocks.userFind },
    membership: { findFirst: mocks.membershipFind },
    company: { update: mocks.companyUpdate },
    tenant: { upsert: mocks.tenantUpsert },
    subscription: {
      findFirst: mocks.subscriptionFind,
      create: mocks.subscriptionCreate,
      update: mocks.subscriptionUpdate,
    },
  },
}));

const userRecord = (id: string) => ({
  email: `${id}@example.test`,
  firstName: id === "user-1" ? "Ada" : "Grace",
  lastName: "Owner",
  memberships: [{ company: { name: id === "user-1" ? "Acme" : "Beacon", country: "GB" } }],
});

describe("WizardService tenant-scoped onboarding", () => {
  const provisioning = { enqueue: vi.fn() };
  const plans = { findByCode: vi.fn() };
  const createService = () => new WizardService(plans as never, provisioning as never);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.draftFind.mockResolvedValue(null);
    mocks.draftUpsert.mockResolvedValue({});
    mocks.draftUpdate.mockResolvedValue({});
    mocks.userFind.mockImplementation(({ where }: { where: { id: string } }) => userRecord(where.id));
    mocks.membershipFind.mockImplementation(({ where }: { where: { userId: string } }) => ({
      companyId: where.userId === "user-1" ? "company-1" : "company-2",
      company: {
        id: where.userId === "user-1" ? "company-1" : "company-2",
        slug: where.userId === "user-1" ? "acme" : "beacon",
        tenant: null,
      },
    }));
    mocks.companyUpdate.mockResolvedValue({ id: "company-1" });
    mocks.tenantUpsert.mockResolvedValue({
      id: "tenant-1",
      status: "CREATING",
      siteUrl: "http://acme.localhost:8080",
    });
    mocks.subscriptionFind.mockResolvedValue(null);
    mocks.subscriptionCreate.mockResolvedValue({ id: "subscription-1" });
    plans.findByCode.mockResolvedValue({ id: "plan-1", tier: "trial" });
    provisioning.enqueue.mockResolvedValue({ jobId: "job-1" });
  });

  it("creates a fresh persisted draft from the authenticated user's company", async () => {
    const draft = await createService().draft("user-1");

    expect(draft.company.name).toBe("Acme");
    expect(draft.team[0]?.email).toBe("user-1@example.test");
    expect(mocks.draftUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
  });

  it("keeps two users' onboarding drafts isolated", async () => {
    const service = createService();
    const [first, second] = await Promise.all([service.draft("user-1"), service.draft("user-2")]);

    expect(first.company.name).toBe("Acme");
    expect(second.company.name).toBe("Beacon");
    expect(mocks.draftUpsert.mock.calls.map(([input]) => input.where.userId)).toEqual(
      expect.arrayContaining(["user-1", "user-2"]),
    );
  });

  it("merges and persists partial updates only for the current user", async () => {
    const draft = await createService().save("user-1", {
      company: { name: "Acme Interiors", industry: "Interior fit-out" },
      currentStep: "regional",
    });

    expect(draft.company).toMatchObject({ name: "Acme Interiors", industry: "Interior fit-out", country: "GB" });
    expect(mocks.draftUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
  });

  it("submits against the registration company instead of a draft-derived tenant", async () => {
    const result = await createService().submit({ id: "user-1", email: "user-1@example.test" });

    expect(result.status).toBe("provisioning");
    expect(mocks.companyUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "company-1" } }));
    expect(mocks.tenantUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1" },
      create: expect.objectContaining({ companyId: "company-1", siteName: "acme" }),
    }));
    expect(provisioning.enqueue).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1", tenantId: "tenant-1" }));
  });

  it("scopes provisioning status lookup to the authenticated user", async () => {
    await createService().status("user-2");

    expect(mocks.membershipFind).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-2" } }));
  });
});
