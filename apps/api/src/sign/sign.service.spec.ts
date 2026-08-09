import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SignService } from "./sign.service";
import { ApiException } from "../common/api.exception";

describe("SignService", () => {
  const createService = () => new SignService();

  describe("overview", () => {
    it("counts requests by state and active templates", () => {
      const overview = createService().overview();

      expect(overview.awaitingSignature).toBe(1);
      expect(overview.completed).toBe(1);
      expect(overview.templatesActive).toBe(3);
    });
  });

  describe("requests", () => {
    it("lists seeded requests and filters by status", () => {
      const service = createService();
      const result = service.listRequests({ page: 1, pageSize: 20, status: "declined" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("SIG-0003");
    });

    it("searches across signer names", () => {
      const result = createService().listRequests({ page: 1, pageSize: 20, q: "OWEN" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("SIG-0001");
    });

    it("creates a request with next code and pending signers", () => {
      const service = createService();
      const request = service.createRequest({
        title: "Beta program participation",
        documentType: "proposal",
        signers: [{ name: "Lena Fischer", email: "lena@brightline.io", role: "CEO" }],
      });

      expect(request.code).toBe("SIG-0006");
      expect(request.status).toBe("draft");
      expect(request.signers[0].status).toBe("pending");
    });

    it("completes when the last signer signs", () => {
      const service = createService();
      const request = service.markSignerSigned("SIG-0001", "S-0002");

      expect(request.signers.every((signer) => signer.status === "signed")).toBe(true);
      expect(request.status).toBe("completed");
      expect(request.signers.find((signer) => signer.code === "S-0002")?.signedAt).toBeDefined();
    });

    it("rejects signing after a decline", () => {
      const service = createService();

      expect(() => service.markSignerSigned("SIG-0003", "S-0005")).toThrowError(
        expect.objectContaining({ code: ErrorCode.UNPROCESSABLE }),
      );
    });

    it("declines a request and records the reason", () => {
      const service = createService();
      const request = service.declineRequest("SIG-0004", { signerCode: "S-0006", reason: "Payment already processed" });

      expect(request.status).toBe("declined");
      expect(request.signers[0].status).toBe("declined");
    });

    it("throws not_found for unknown requests", () => {
      expect(() => createService().detailRequest("SIG-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });

    it("removes a request", () => {
      const service = createService();
      service.removeRequest("SIG-0005");

      expect(service.listRequests({ page: 1, pageSize: 20 }).meta.total).toBe(4);
    });
  });

  describe("templates", () => {
    it("lists seeded templates filtered by status", () => {
      const result = createService().listTemplates({ page: 1, pageSize: 20, status: "archived" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("STMP-0004");
    });

    it("creates a template starting at version 1", () => {
      const service = createService();
      const template = service.createTemplate({
        name: "Supplier onboarding",
        documentType: "purchase_order",
        signerRoles: ["Supplier"],
      });

      expect(template.code).toBe("STMP-0005");
      expect(template.version).toBe(1);
      expect(template.status).toBe("active");
    });

    it("bumps version on update and throws not_found", () => {
      const service = createService();

      expect(service.updateTemplate("STMP-0002", { name: "Service agreement (2+ parties)" }).version).toBe(3);
      expect(() => service.detailTemplate("STMP-9999")).toThrowError(ApiException);

      service.removeTemplate("STMP-0004");
      expect(service.listTemplates({ page: 1, pageSize: 20 }).meta.total).toBe(3);
    });
  });

  describe("audit", () => {
    it("lists audit events newest first", () => {
      const result = createService().listAudit({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(6);
      expect(result.items[0].id).toBe("AUD-003");
    });
  });
});
