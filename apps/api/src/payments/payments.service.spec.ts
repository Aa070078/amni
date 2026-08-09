import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { PaymentsService } from "./payments.service";

describe("PaymentsService", () => {
  const createService = () => new PaymentsService();

  describe("list", () => {
    it("returns the first page sorted by date desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(7);
      expect(result.items[0].code).toBe("PAY-0001");
    });

    it("filters by type", () => {
      const result = createService().list({ page: 1, pageSize: 20, type: "outgoing" });

      expect(result.items.every((payment) => payment.type === "outgoing")).toBe(true);
      expect(result.meta.total).toBe(3);
    });

    it("searches case-insensitively across party", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "serenity" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("PAY-0001");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 4 });
      const page2 = service.list({ page: 2, pageSize: 4 });

      expect(page1.items.length).toBe(4);
      expect(page2.items.length).toBe(3);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("detail", () => {
    it("returns the payment with all fields", () => {
      const detail = createService().detail("PAY-0001");

      expect(detail.code).toBe("PAY-0001");
      expect(detail.type).toBe("incoming");
      expect(detail.amount).toBe(5000);
      expect(detail.method).toBe("bank_transfer");
    });

    it("throws not_found for an unknown payment", () => {
      expect(() => createService().detail("PAY-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and applies defaults", () => {
      const service = createService();
      const payment = service.create({
        type: "incoming",
        party: "Test Client",
        amount: 1200,
      });

      expect(payment.code).toBe("PAY-0008");
      expect(payment.method).toBe("bank_transfer");
      expect(payment.currency).toBe("USD");
      expect(payment.status).toBe("cleared");
      expect(service.detail("PAY-0008").party).toBe("Test Client");
    });
  });
});
