import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCrmCallLogInput,
  type CrmCallLog,
  type CrmCallLogListQuery,
  type CrmCallLogListResponse,
  type UpdateCrmCallLogInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { iso, newId, paginate, sortRecords } from "./crm-common";

const SORT_WHITELIST = new Set(["phoneNumber", "direction", "status", "agent", "startTime", "durationSeconds"]);

const SEED: CrmCallLog[] = [
  { id: "call-1", direction: "outbound", status: "completed", phoneNumber: "+1 415-555-0142", agent: "Amara Osei", provider: "internal", startTime: iso(2, "hour"), endTime: iso(2, "hour").replace(/(T\d{2}):\d{2}/, "$1:45"), durationSeconds: 900, referenceType: "deal", referenceCode: "DL-0001", notes: "Discovery call with Maya Chen.", createdAt: iso(2, "hour") },
  { id: "call-2", direction: "inbound", status: "completed", phoneNumber: "+49 30 1234 5678", agent: "Theo Lindqvist", provider: "internal", startTime: iso(6, "hour"), endTime: iso(6, "hour"), durationSeconds: 480, referenceType: "deal", referenceCode: "DL-0003", notes: "Jonas called re: load ratings.", createdAt: iso(6, "hour") },
  { id: "call-3", direction: "outbound", status: "missed", phoneNumber: "+1 646-555-0118", agent: "Theo Lindqvist", provider: "internal", startTime: iso(1, "day"), endTime: null, durationSeconds: 0, referenceType: "deal", referenceCode: "DL-0006", notes: "Tried Sofia; will retry tomorrow.", createdAt: iso(1, "day") },
  { id: "call-4", direction: "outbound", status: "completed", phoneNumber: "+44 161 555 0190", agent: "Amara Osei", provider: "internal", startTime: iso(3, "day"), endTime: iso(3, "day"), durationSeconds: 1_260, referenceType: "deal", referenceCode: "DL-0005", notes: "Fabric swatch comparison.", createdAt: iso(3, "day") },
  { id: "call-5", direction: "inbound", status: "in_progress", phoneNumber: "+1 202-555-0188", agent: "Amara Osei", provider: "internal", startTime: iso(0, "minute"), endTime: null, durationSeconds: 0, referenceType: "deal", referenceCode: "DL-0001", notes: "Facilities team on the line about the PO.", createdAt: iso(0, "minute") },
];

@Injectable()
export class CrmCallLogsService {
  private records: CrmCallLog[] = structuredClone(SEED);

  list(query: CrmCallLogListQuery): CrmCallLogListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((call) => {
      if (query.direction && call.direction !== query.direction) return false;
      if (query.status && call.status !== query.status) return false;
      if (query.agent && call.agent !== query.agent) return false;
      if (query.referenceType && call.referenceType !== query.referenceType) return false;
      if (query.referenceCode && call.referenceCode !== query.referenceCode) return false;
      if (!q) return true;
      return [call.phoneNumber, call.agent ?? "", call.notes ?? "", call.referenceCode ?? ""].join(" ").toLowerCase().includes(q);
    });

    const sorted = sortRecords(filtered, query.sortBy, query.sortDir ?? "asc", SORT_WHITELIST);
    const { items, total } = paginate(sorted, query.page, query.pageSize);

    const summary = {
      total: this.records.length,
      completed: this.records.filter((call) => call.status === "completed").length,
      missed: this.records.filter((call) => call.status === "missed").length,
      incoming: this.records.filter((call) => call.direction === "inbound").length,
      outgoing: this.records.filter((call) => call.direction === "outbound").length,
      totalDurationSeconds: this.records.reduce((sum, call) => sum + (call.durationSeconds ?? 0), 0),
    };

    return { items, meta: { total, page: query.page, pageSize: query.pageSize }, summary };
  }

  detail(id: string): CrmCallLog {
    return this.find(id);
  }

  create(input: CreateCrmCallLogInput): CrmCallLog {
    const call: CrmCallLog = {
      id: newId("call"),
      direction: input.direction,
      status: input.status,
      phoneNumber: input.phoneNumber,
      agent: input.agent,
      provider: input.provider ?? "internal",
      startTime: new Date().toISOString(),
      endTime: input.endTime,
      durationSeconds: input.durationSeconds,
      recordingUrl: input.recordingUrl,
      referenceType: input.referenceType,
      referenceCode: input.referenceCode,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
    this.records.unshift(call);
    return call;
  }

  update(id: string, input: UpdateCrmCallLogInput): CrmCallLog {
    const call = this.find(id);
    if (input.direction !== undefined) call.direction = input.direction;
    if (input.status !== undefined) call.status = input.status;
    if (input.phoneNumber !== undefined) call.phoneNumber = input.phoneNumber;
    if (input.agent !== undefined) call.agent = input.agent;
    if (input.provider !== undefined) call.provider = input.provider;
    if (input.endTime !== undefined) call.endTime = input.endTime;
    if (input.durationSeconds !== undefined) call.durationSeconds = input.durationSeconds;
    if (input.recordingUrl !== undefined) call.recordingUrl = input.recordingUrl;
    if (input.referenceType !== undefined) call.referenceType = input.referenceType;
    if (input.referenceCode !== undefined) call.referenceCode = input.referenceCode;
    if (input.notes !== undefined) call.notes = input.notes;
    return call;
  }

  remove(id: string): void {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Call log ${id} not found` });
    }
    this.records.splice(index, 1);
  }

  private find(id: string): CrmCallLog {
    const call = this.records.find((record) => record.id === id);
    if (!call) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Call log ${id} not found` });
    }
    return call;
  }
}
