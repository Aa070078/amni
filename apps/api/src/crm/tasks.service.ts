import { Injectable } from "@nestjs/common";
import { CRM_TASK_STATUSES, type CreateCrmTaskInput, type CrmTask, type CrmTaskBoard, type CrmTaskListQuery, type CrmTaskListResponse, type UpdateCrmTaskInput } from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotificationsService } from "./notifications.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

const SORT_FIELD: Record<string, string> = { subject: "title", status: "status", priority: "category", dueDate: "event_at", assignedTo: "assigned_to", createdAt: "creation", updatedAt: "modified" };

@Injectable()
export class CrmTasksService {
  constructor(private readonly records: CrmRecordRepository, private readonly notifications: CrmNotificationsService) {}

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: CrmTaskListQuery): Promise<CrmTaskListResponse> {
    const { items, total } = await this.records.list<CrmTask>(user, meta, "task", {
      filters: { status: query.status, category: query.priority, assigned_to: query.assignedTo, reference_type: query.referenceType, reference_code: query.referenceCode, state_group: query.open === "true" ? "open" : query.open === "false" ? "closed" : undefined },
      q: query.q,
      orderBy: `${SORT_FIELD[query.sortBy ?? "updatedAt"] ?? "modified"} ${query.sortDir ?? "desc"}`,
      start: (query.page - 1) * query.pageSize,
      pageLength: query.pageSize,
    });
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async board(user: GatewayUser, meta: GatewayRequestMeta, query: { q?: string }): Promise<CrmTaskBoard> {
    const { items } = await this.records.list<CrmTask>(user, meta, "task", { q: query.q, orderBy: "modified desc", pageLength: 100 });
    return { columns: CRM_TASK_STATUSES.map(({ value, label }) => ({ status: value, label, count: items.filter((task) => task.status === value).length, items: items.filter((task) => task.status === value) })) };
  }

  detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<CrmTask> {
    return this.records.get(user, meta, "task", code);
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCrmTaskInput): Promise<CrmTask> {
    const now = new Date().toISOString();
    const task: CrmTask = { code: newId("TSK"), subject: input.subject, description: input.description, status: input.status ?? "backlog", priority: input.priority ?? "low", dueDate: input.dueDate, assignedTo: input.assignedTo, referenceType: input.referenceType, referenceCode: input.referenceCode, completedAt: input.status === "done" ? now : null, createdAt: now, updatedAt: now };
    const created = await this.records.create(user, meta, "task", task.code, task, indexesFor(task));
    await this.notifyAssigned(user, meta, created);
    return created;
  }

  async update(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateCrmTaskInput): Promise<CrmTask> {
    const current = await this.detail(user, meta, code);
    const status = input.status ?? current.status;
    const task: CrmTask = { ...current, ...input, code, status, completedAt: status === "done" ? current.completedAt ?? new Date().toISOString() : null, updatedAt: new Date().toISOString() };
    const updated = await this.records.update(user, meta, "task", code, task, indexesFor(task));
    await this.notifyAssigned(user, meta, updated);
    return updated;
  }

  setStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, status: CrmTask["status"]): Promise<CrmTask> {
    return this.update(user, meta, code, { status });
  }

  remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    return this.records.remove(user, meta, "task", code);
  }

  async listForReference(user: GatewayUser, meta: GatewayRequestMeta, referenceType: string, referenceCode: string): Promise<CrmTask[]> {
    return (await this.records.list<CrmTask>(user, meta, "task", { filters: { reference_type: referenceType, reference_code: referenceCode }, pageLength: 100 })).items;
  }

  private async notifyAssigned(user: GatewayUser, meta: GatewayRequestMeta, task: CrmTask): Promise<void> {
    if (!task.assignedTo) return;
    await this.notifications.add(user, meta, { type: "info", title: `Task ${task.code} assigned`, body: `${task.subject} — assigned to ${task.assignedTo}.`, href: "/sales/crm/tasks" });
  }
}

function indexesFor(task: CrmTask) {
  return { title: task.subject, status: task.status, category: task.priority, stateGroup: task.status === "done" || task.status === "cancelled" ? "closed" : "open", assignedTo: task.assignedTo, referenceType: task.referenceType, referenceCode: task.referenceCode, eventAt: task.dueDate ?? undefined, searchText: [task.subject, task.description, task.assignedTo, task.referenceCode].filter(Boolean).join(" ") };
}
