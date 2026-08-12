import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CrmCallLogsService } from "./call-logs.service";
import { ApiException } from "../common/api.exception";

describe("CrmCallLogsService", () => {
  const createService = () => new CrmCallLogsService();

  describe("list", () => {
    it("computes a summary over all records", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.summary.total).toBe(5);
      expect(result.summary.completed).toBe(3);
      expect(result.summary.missed).toBe(1);
      expect(result.summary.incoming).toBe(2);
      expect(result.summary.outgoing).toBe(3);
      expect(result.summary.totalDurationSeconds).toBe(900 + 480 + 1_260);
    });

    it("filters by direction and status", () => {
      const service = createService();
      const inbound = service.list({ page: 1, pageSize: 20, direction: "inbound" });
      const completed = service.list({ page: 1, pageSize: 20, status: "completed" });

      expect(inbound.items).toHaveLength(2);
      expect(completed.items).toHaveLength(3);
    });

    it("searches by phone number and reference", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "DL-0003" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].id).toBe("call-2");
    });
  });

  describe("create", () => {
    it("creates a call log with a fresh id and timestamp", () => {
      const service = createService();
      const call = service.create({
        direction: "outbound",
        status: "completed",
        phoneNumber: "+1 555-0100",
        agent: "Amara Osei",
      });

      expect(call.id).toMatch(/^call-/);
      expect(call.provider).toBe("internal");
      expect(call.createdAt).toBeDefined();
      expect(service.list({ page: 1, pageSize: 20 }).summary.total).toBe(6);
    });
  });

  describe("update", () => {
    it("updates provided fields only", () => {
      const service = createService();
      const updated = service.update("call-3", { status: "completed", durationSeconds: 300 });

      expect(updated.status).toBe("completed");
      expect(updated.durationSeconds).toBe(300);
      expect(updated.phoneNumber).toBe("+1 646-555-0118");
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().update("call-999", { status: "completed" })).toThrowError(
        expect.objectContaining({ status: 404, code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes a known log and throws for an unknown one", () => {
      const service = createService();
      service.remove("call-5");

      expect(service.list({ page: 1, pageSize: 20 }).summary.total).toBe(4);
      expect(() => service.remove("call-5")).toThrow(ApiException);
    });
  });
});
