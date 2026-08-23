import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProvisioningService } from "./provisioning.service";

const mocks = vi.hoisted(() => ({
  membershipFind: vi.fn(),
  jobFind: vi.fn(),
  jobUpdate: vi.fn(),
  tenantUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@amni/db", () => ({
  prisma: {
    membership: { findFirst: mocks.membershipFind },
    provisioningJob: { findUnique: mocks.jobFind, update: mocks.jobUpdate },
    tenant: { update: mocks.tenantUpdate },
    auditLog: { create: mocks.auditCreate },
  },
}));

describe("ProvisioningService recovery", () => {
  const remove = vi.fn();
  const queue = {
    getJob: vi.fn(async () => ({ getState: vi.fn(async () => "failed"), remove })),
    add: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membershipFind.mockResolvedValue({
      companyId: "company-1",
      company: {
        id: "company-1",
        tenant: {
          id: "tenant-1",
          status: "FAILED",
          siteName: "acme",
          siteUrl: "http://acme.localhost:8080",
        },
      },
    });
    mocks.jobFind.mockResolvedValue({
      id: "job-1",
      state: "VALIDATION_FAILED",
      attempts: 1,
    });
    mocks.jobUpdate.mockResolvedValue({ id: "job-1" });
    mocks.tenantUpdate.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
    queue.add.mockResolvedValue({});
  });

  it("removes the retained failed BullMQ job and requeues the same tenant safely", async () => {
    const service = new ProvisioningService(queue as never);
    await expect(service.retryFor("user-1")).resolves.toEqual({ jobId: "job-1" });

    expect(mocks.membershipFind).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
    expect(remove).toHaveBeenCalled();
    expect(mocks.jobUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "job-1" },
      data: expect.objectContaining({ state: "QUEUED", lastError: null }),
    }));
    expect(queue.add).toHaveBeenCalledWith("provision", expect.objectContaining({ tenantId: "tenant-1" }), expect.any(Object));
  });

  it("does not retry an active workspace", async () => {
    mocks.membershipFind.mockResolvedValueOnce({
      companyId: "company-1",
      company: { id: "company-1", tenant: { id: "tenant-1", status: "ACTIVE" } },
    });

    await expect(new ProvisioningService(queue as never).retryFor("user-1")).rejects.toMatchObject({ code: "conflict" });
    expect(queue.add).not.toHaveBeenCalled();
  });
});
