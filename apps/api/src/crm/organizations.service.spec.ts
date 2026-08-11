import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CrmOrganizationsService } from "./organizations.service";
import { CrmContactsService } from "./contacts.service";
import { DealsService } from "../deals/deals.service";
import { ApiException } from "../common/api.exception";

describe("CrmOrganizationsService", () => {
  const createService = () => new CrmOrganizationsService(new CrmContactsService(), new DealsService());

  describe("list", () => {
    it("reports aggregate stats over all records", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(10);
      expect(result.stats.total).toBe(10);
      expect(result.stats.active).toBeGreaterThan(0);
      expect(result.stats.leads).toBeGreaterThan(0);
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "inactive" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe("ORG-0009");
    });

    it("searches by name and industry", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "healthcare" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("ORG-0010");
    });
  });

  describe("detail", () => {
    it("includes contact and deal counts", () => {
      const org = createService().detail("ORG-0001");

      expect(org.contactCount).toBeGreaterThanOrEqual(1);
      expect(org.dealCount).toBeGreaterThan(0);
      expect(org.openDealValue).toBeGreaterThan(0);
    });

    it("throws NOT_FOUND for an unknown code", () => {
      expect(() => createService().detail("ORG-9999")).toThrowError(
        expect.objectContaining({ status: 404, code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("allocates the next code and defaults status to lead", () => {
      const org = createService().create({ name: "Halcyon Group" });

      expect(org.code).toBe("ORG-0011");
      expect(org.status).toBe("lead");
    });
  });

  describe("update", () => {
    it("updates provided fields only", () => {
      const service = createService();
      const updated = service.update("ORG-0001", { territory: "global" });

      expect(updated.territory).toBe("global");
      expect(updated.name).toBe("Serenity Interiors");
    });
  });

  describe("remove", () => {
    it("removes a known org and throws for an unknown one", () => {
      const service = createService();
      service.remove("ORG-0010");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(9);
      expect(() => service.remove("ORG-0010")).toThrow(ApiException);
    });
  });
});
