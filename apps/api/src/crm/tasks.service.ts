import { Injectable } from "@nestjs/common";
import {
  CRM_TASK_STATUSES,
  ErrorCode,
  type CreateCrmTaskInput,
  type CrmTask,
  type CrmTaskBoard,
  type CrmTaskListQuery,
  type CrmTaskListResponse,
  type UpdateCrmTaskInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { dateOnly, iso, nextCode, paginate, sortRecords } from "./crm-common";
import { type CrmNotificationsService } from "./notifications.service";

const SORT_WHITELIST = new Set(["subject", "status", "priority", "dueDate", "assignedTo", "createdAt", "updatedAt"]);

const SEED: CrmTask[] = [
  { code: "TSK-0001", subject: "Send revised proposal to Serenity", description: "Incorporate the facilities team's comments on section 4 and resend.", status: "working", priority: "high", dueDate: dateOnly(5), assignedTo: "Amara Osei", referenceType: "deal", referenceCode: "DL-0001", createdAt: iso(14), updatedAt: iso(2) },
  { code: "TSK-0002", subject: "Compare fabric swatches for Summit View", description: "Three suppliers shortlisted; document lead times and pricing.", status: "backlog", priority: "medium", dueDate: dateOnly(12), assignedTo: "Amara Osei", referenceType: "deal", referenceCode: "DL-0005", createdAt: iso(12), updatedAt: iso(12) },
  { code: "TSK-0003", subject: "Load ratings per aisle — Northwind", description: "Need load ratings per aisle before finalising the shelving quote.", status: "working", priority: "urgent", dueDate: dateOnly(3), assignedTo: "Theo Lindqvist", referenceType: "deal", referenceCode: "DL-0003", createdAt: iso(10), updatedAt: iso(1) },
  { code: "TSK-0004", subject: "Pilot store kickoff call with Aster", description: "Confirm pilot store location and demo dates.", status: "review", priority: "high", dueDate: dateOnly(7), assignedTo: "Theo Lindqvist", referenceType: "deal", referenceCode: "DL-0006", createdAt: iso(9), updatedAt: iso(1) },
  { code: "TSK-0005", subject: "Renewal terms worksheet — Vantage", description: "Prior-year terms plus two extra seats; confirm headcount.", status: "backlog", priority: "medium", dueDate: dateOnly(14), assignedTo: "Amara Osei", referenceType: "deal", referenceCode: "DL-0008", createdAt: iso(8), updatedAt: iso(8) },
  { code: "TSK-0006", subject: "Chase PO from Meridian facilities team", description: "Final PO pending from facilities; follow up Thursday.", status: "working", priority: "high", dueDate: dateOnly(2), assignedTo: "Amara Osei", referenceType: "deal", referenceCode: "DL-0001", createdAt: iso(7), updatedAt: iso(1) },
  { code: "TSK-0007", subject: "Confirm Fjord margin split", description: "Margin split agreed verbally; confirm in writing with Nordic Design Partners.", status: "backlog", priority: "low", dueDate: dateOnly(20), assignedTo: "Theo Lindqvist", referenceType: "deal", referenceCode: "DL-0009", createdAt: iso(6), updatedAt: iso(6) },
  { code: "TSK-0008", subject: "Quarterly outreach list for retail prospects", description: "Build the outreach list from trade show contacts.", status: "backlog", priority: "low", dueDate: null, assignedTo: "Theo Lindqvist", referenceType: "lead", referenceCode: "LD-0001", createdAt: iso(5), updatedAt: iso(5) },
  { code: "TSK-0009", subject: "Onboard Copperwood revisit for next FY", description: "Lost to incumbent vendor; log a revisit for next fiscal year.", status: "done", priority: "low", dueDate: dateOnly(-3), assignedTo: "Amara Osei", referenceType: "deal", referenceCode: "DL-0010", completedAt: iso(3), createdAt: iso(15), updatedAt: iso(3) },
];

@Injectable()
export class CrmTasksService {
  private records: CrmTask[] = structuredClone(SEED);

  constructor(private readonly notifications: CrmNotificationsService) {}

  list(query: CrmTaskListQuery): CrmTaskListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((task) => {
      if (query.status && task.status !== query.status) return false;
      if (query.priority && task.priority !== query.priority) return false;
      if (query.assignedTo && task.assignedTo !== query.assignedTo) return false;
      if (query.referenceType && task.referenceType !== query.referenceType) return false;
      if (query.referenceCode && task.referenceCode !== query.referenceCode) return false;
      if (query.open === "true" && task.status === "done") return false;
      if (query.open === "false" && task.status !== "done") return false;
      if (!q) return true;
      return [task.subject, task.description ?? "", task.assignedTo ?? "", task.referenceCode ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sorted = sortRecords(filtered, query.sortBy, query.sortDir ?? "asc", SORT_WHITELIST);
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  board(query: { q?: string }): CrmTaskBoard {
    const items = this.list({ page: 1, pageSize: 100, q: query.q, sortDir: "asc" }).items;
    return {
      columns: CRM_TASK_STATUSES.map(({ value, label }) => ({
        status: value,
        label,
        count: items.filter((task) => task.status === value).length,
        items: items
          .filter((task) => task.status === value)
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
      })),
    };
  }

  detail(code: string): CrmTask {
    return this.find(code);
  }

  create(input: CreateCrmTaskInput): CrmTask {
    const task: CrmTask = {
      code: nextCode(this.records, "TSK"),
      subject: input.subject,
      description: input.description,
      status: input.status ?? "backlog",
      priority: input.priority ?? "low",
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      referenceType: input.referenceType,
      referenceCode: input.referenceCode,
      completedAt: input.status === "done" ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.unshift(task);
    this.notifyAssigned(task);
    return task;
  }

  update(code: string, input: UpdateCrmTaskInput): CrmTask {
    const task = this.find(code);
    if (input.subject !== undefined) task.subject = input.subject;
    if (input.description !== undefined) task.description = input.description;
    if (input.priority !== undefined) task.priority = input.priority;
    if (input.dueDate !== undefined) task.dueDate = input.dueDate;
    if (input.assignedTo !== undefined) task.assignedTo = input.assignedTo;
    if (input.referenceType !== undefined) task.referenceType = input.referenceType;
    if (input.referenceCode !== undefined) task.referenceCode = input.referenceCode;
    if (input.status !== undefined) {
      task.status = input.status;
      task.completedAt = input.status === "done" ? new Date().toISOString() : null;
    }
    task.updatedAt = new Date().toISOString();
    this.notifyAssigned(task);
    return task;
  }

  setStatus(code: string, status: CrmTask["status"]): CrmTask {
    return this.update(code, { status });
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Task ${code} not found` });
    }
    this.records.splice(index, 1);
  }

  listForReference(referenceType: string, referenceCode: string): CrmTask[] {
    return this.records.filter((task) => task.referenceType === referenceType && task.referenceCode === referenceCode);
  }

  private find(code: string): CrmTask {
    const task = this.records.find((record) => record.code === code);
    if (!task) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Task ${code} not found` });
    }
    return task;
  }

  private notifyAssigned(task: CrmTask): void {
    if (!task.assignedTo) return;
    this.notifications.add({
      type: "info",
      title: `Task ${task.code} assigned`,
      body: `${task.subject} — assigned to ${task.assignedTo}.`,
      href: `/sales/crm/tasks`,
    });
  }
}
