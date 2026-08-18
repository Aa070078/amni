import { Injectable } from "@nestjs/common";
import type { CreateCrmCallLogInput, CrmCallLog, CrmCallLogListQuery, CrmCallLogListResponse, UpdateCrmCallLogInput } from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

const SORT_FIELD: Record<string, string> = { phoneNumber: "title", direction: "category", status: "status", agent: "assigned_to", startTime: "event_at", durationSeconds: "numeric_value" };

@Injectable()
export class CrmCallLogsService {
  constructor(private readonly records: CrmRecordRepository) {}

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: CrmCallLogListQuery): Promise<CrmCallLogListResponse> {
    const filters = { status: query.status, category: query.direction, assigned_to: query.agent, reference_type: query.referenceType, reference_code: query.referenceCode };
    const [{ items, total }, all] = await Promise.all([
      this.records.list<CrmCallLog>(user, meta, "call_log", { filters, q: query.q, orderBy: `${SORT_FIELD[query.sortBy ?? "startTime"] ?? "event_at"} ${query.sortDir ?? "desc"}`, start: (query.page - 1) * query.pageSize, pageLength: query.pageSize }),
      this.records.list<CrmCallLog>(user, meta, "call_log", { pageLength: 100 }),
    ]);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize }, summary: { total: all.total, completed: all.items.filter((call) => call.status === "completed").length, missed: all.items.filter((call) => call.status === "missed").length, incoming: all.items.filter((call) => call.direction === "inbound").length, outgoing: all.items.filter((call) => call.direction === "outbound").length, totalDurationSeconds: all.items.reduce((sum, call) => sum + (call.durationSeconds ?? 0), 0) } };
  }

  detail(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<CrmCallLog> { return this.records.get(user, meta, "call_log", id); }

  create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCrmCallLogInput): Promise<CrmCallLog> {
    const now = new Date().toISOString();
    const call: CrmCallLog = { id: newId("call"), direction: input.direction, status: input.status, phoneNumber: input.phoneNumber, agent: input.agent, provider: input.provider ?? "internal", startTime: now, endTime: input.endTime, durationSeconds: input.durationSeconds, recordingUrl: input.recordingUrl, referenceType: input.referenceType, referenceCode: input.referenceCode, notes: input.notes, createdAt: now };
    return this.records.create(user, meta, "call_log", call.id, call, indexesFor(call));
  }

  async update(user: GatewayUser, meta: GatewayRequestMeta, id: string, input: UpdateCrmCallLogInput): Promise<CrmCallLog> {
    const call = { ...(await this.detail(user, meta, id)), ...input, id };
    return this.records.update(user, meta, "call_log", id, call, indexesFor(call));
  }

  remove(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<void> { return this.records.remove(user, meta, "call_log", id); }
}

function indexesFor(call: CrmCallLog) {
  return { title: call.phoneNumber, status: call.status, category: call.direction, assignedTo: call.agent, referenceType: call.referenceType, referenceCode: call.referenceCode, eventAt: call.startTime, numericValue: call.durationSeconds, searchText: [call.phoneNumber, call.agent, call.notes, call.referenceCode].filter(Boolean).join(" ") };
}
