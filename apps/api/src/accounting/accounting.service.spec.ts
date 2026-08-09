import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { AccountingService } from "./accounting.service";
import { ApiException } from "../common/api.exception";

describe("AccountingService", () => {
  const createService = () => new AccountingService();

  describe("accounts", () => {
    it("lists accounts sorted by code and filters by type", () => {
      const service = createService();
      const result = service.listAccounts({ page: 1, pageSize: 100 });

      expect(result.meta.total).toBe(10);
      expect(result.items[0].code).toBe("AC-1000");

      const assets = service.listAccounts({ page: 1, pageSize: 100, type: "asset" });
      expect(assets.meta.total).toBe(4);
    });

    it("creates an account with the next code", () => {
      const service = createService();
      const account = service.createAccount({ name: "Petty cash", type: "asset", group: "Current Assets" });

      expect(account.code).toBe("AC-5001");
      expect(account.balance).toBe(0);
      expect(account.status).toBe("active");
    });

    it("updates, changes status and throws not_found", () => {
      const service = createService();

      expect(service.updateAccount("AC-1000", { name: "Cash at bank" }).name).toBe("Cash at bank");
      expect(service.changeAccountStatus("AC-1000", { status: "archived" }).status).toBe("archived");
      expect(() => service.detailAccount("AC-9999")).toThrowError(expect.objectContaining({ code: ErrorCode.NOT_FOUND }));

      service.removeAccount("AC-5000");
      expect(service.listAccounts({ page: 1, pageSize: 100 }).meta.total).toBe(9);
    });
  });

  describe("journal entries", () => {
    it("lists seeded entries and filters by status", () => {
      const service = createService();
      const result = service.listJournalEntries({ page: 1, pageSize: 100, status: "draft" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("GL-0005");
    });

    it("creates a draft entry resolving account names", () => {
      const service = createService();
      const entry = service.createJournalEntry({
        memo: "Test accrual",
        entries: [
          { accountCode: "AC-5000", debit: 100, credit: 0 },
          { accountCode: "AC-2000", debit: 0, credit: 100 },
        ],
      });

      expect(entry.code).toBe("GL-0006");
      expect(entry.status).toBe("draft");
      expect(entry.entries[0].accountName).toBe("Operating expenses");
    });

    it("posts an entry and applies signed balances to accounts", () => {
      const service = createService();
      const before = service.detailAccount("AC-5000").balance;

      const entry = service.postJournalEntry("GL-0005");

      expect(entry.status).toBe("posted");
      expect(entry.postedAt).toBeDefined();
      expect(service.detailAccount("AC-5000").balance).toBe(before + 500);
    });

    it("reverses a posted entry and reposts signed balances", () => {
      const service = createService();

      const before = service.detailAccount("AC-2000").balance;
      const reversed = service.reverseJournalEntry("GL-0001");
      expect(reversed.status).toBe("reversed");
      expect(service.detailAccount("AC-2000").balance).toBe(before - 4200);
    });

    it("rejects posting a reversed entry", () => {
      const service = createService();
      service.reverseJournalEntry("GL-0001");

      expect(() => service.postJournalEntry("GL-0001")).toThrowError(
        expect.objectContaining({ code: ErrorCode.UNPROCESSABLE }),
      );
    });

    it("rejects reversing a draft entry", () => {
      expect(() => createService().reverseJournalEntry("GL-0005")).toThrowError(
        expect.objectContaining({ code: ErrorCode.UNPROCESSABLE }),
      );
    });
  });

  describe("trial balance", () => {
    it("balances debits and credits and derives rows from active accounts", () => {
      const tb = createService().trialBalance();

      expect(tb.rows.length).toBe(10);
      expect(tb.totalDebit).toBe(tb.totalCredit);
      expect(tb.totalDebit).toBeGreaterThan(0);
    });
  });

  describe("ledger", () => {
    it("replays posted movements with a running balance", () => {
      const ledger = createService().ledger("AC-5000");
      const posted = ledger.movements.filter((movement) => movement.balance !== undefined);

      expect(ledger.accountCode).toBe("AC-5000");
      expect(posted.length).toBeGreaterThanOrEqual(1);
    });

    it("throws not_found for an unknown account", () => {
      expect(() => createService().ledger("AC-9999")).toThrowError(ApiException);
    });
  });
});
