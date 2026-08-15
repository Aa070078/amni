import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CrmTasksService } from "./tasks.service";
import { CrmNotificationsService } from "./notifications.service";
import { ApiException } from "../common/api.exception";

describe("CrmTasksService", () => {
  const createService = () => new CrmTasksService(new CrmNotificationsService());

  describe("list", () => {
    it("returns all tasks by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(9);
    });

    it("filters by status and priority", () => {
      const service = createService();
      const working = service.list({ page: 1, pageSize: 20, status: "working" });
      const urgent = service.list({ page: 1, pageSize: 20, priority: "urgent" });

      expect(working.items.every((task) => task.status === "working")).toBe(true);
      expect(urgent.items).toHaveLength(1);
      expect(urgent.items[0].code).toBe("TSK-0003");
    });

    it("supports open/closed toggles", () => {
      const service = createService();
      const open = service.list({ page: 1, pageSize: 20, open: "true" });
      const closed = service.list({ page: 1, pageSize: 20, open: "false" });

      expect(open.items.every((task) => task.status !== "done")).toBe(true);
      expect(closed.items.every((task) => task.status === "done")).toBe(true);
    });

    it("filters by reference", () => {
      const result = createService().list({ page: 1, pageSize: 20, referenceType: "lead", referenceCode: "LD-0001" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe("TSK-0008");
    });
  });

  describe("board", () => {
    it("groups tasks into columns in canonical status order", () => {
      const board = createService().board({});

      expect(board.columns.map((column) => column.status)).toEqual(["backlog", "working", "review", "done", "cancelled"]);
      expect(board.columns.reduce((sum, column) => sum + column.count, 0)).toBe(9);
    });
  });

  describe("create", () => {
    it("creates a task and notifies the assignee", () => {
      const notifications = new CrmNotificationsService();
      const service = new CrmTasksService(notifications);

      const task = service.create({ subject: "Review contract", assignedTo: "Amara Osei", priority: "high" });

      expect(task.code).toBe("TSK-0010");
      expect(task.status).toBe("backlog");
      expect(notifications.list(undefined).unreadCount).toBe(1);
      expect(notifications.list(undefined).items[0].title).toContain("TSK-0010");
    });

    it("stamps completedAt when created done", () => {
      const task = createService().create({ subject: "Done task", status: "done" });

      expect(task.completedAt).toBeDefined();
    });
  });

  describe("setStatus", () => {
    it("stamps completedAt when moved to done and clears it otherwise", () => {
      const service = createService();
      const done = service.setStatus("TSK-0001", "done");
      const reopened = service.setStatus("TSK-0001", "working");

      expect(done.completedAt).toBeDefined();
      expect(reopened.completedAt).toBeNull();
    });

    it("throws NOT_FOUND for an unknown code", () => {
      expect(() => createService().setStatus("TSK-9999", "done")).toThrowError(
        expect.objectContaining({ status: 404, code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("listForReference", () => {
    it("returns tasks linked to a record", () => {
      const tasks = createService().listForReference("deal", "DL-0001");

      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks.every((task) => task.referenceCode === "DL-0001")).toBe(true);
    });
  });

  describe("remove", () => {
    it("removes a known task and throws for an unknown one", () => {
      const service = createService();
      service.remove("TSK-0009");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(8);
      expect(() => service.remove("TSK-0009")).toThrow(ApiException);
    });
  });
});
