import { ErrorCode } from "@amni/shared";
import { ApiException } from "../common/api.exception";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import type { CrmRecordIndexes, ListCrmRecordsOptions } from "@amni/erp";
import type { CrmRecordType } from "./crm-record.repository";

export const TEST_USER: GatewayUser = { id: "user-1", email: "owner@example.com", role: "owner" };
export const TEST_META: GatewayRequestMeta = { requestId: "req-crm-test", ip: "127.0.0.1" };

interface Stored { payload: object; indexes: CrmRecordIndexes; created: number; }

export class FakeCrmRecordRepository {
  private readonly stores = new Map<CrmRecordType, Map<string, Stored>>();

  seed<T extends object>(type: CrmRecordType, code: string, payload: T, indexes: CrmRecordIndexes = {}): void {
    this.store(type).set(code, { payload: structuredClone(payload), indexes, created: Date.now() + this.store(type).size });
  }

  async list<T>(_user: GatewayUser, _meta: GatewayRequestMeta, type: CrmRecordType, options: ListCrmRecordsOptions = {}): Promise<{ items: T[]; total: number }> {
    const fieldMap: Record<string, keyof CrmRecordIndexes> = { status: "status", category: "category", state_group: "stateGroup", assigned_to: "assignedTo", reference_type: "referenceType", reference_code: "referenceCode", email: "email" };
    let records = [...this.store(type).values()].filter((record) => Object.entries(options.filters ?? {}).every(([field, value]) => value == null || value === "" || String(record.indexes[fieldMap[field]!] ?? "") === String(value)));
    if (options.q) { const q = options.q.toLowerCase(); records = records.filter((record) => String(record.indexes.searchText ?? "").toLowerCase().includes(q)); }
    if ((options.orderBy ?? "").endsWith("desc")) records.reverse();
    const total = records.length;
    const start = options.start ?? 0;
    return { items: records.slice(start, start + (options.pageLength ?? 20)).map((record) => structuredClone(record.payload) as T), total };
  }

  async get<T>(_user: GatewayUser, _meta: GatewayRequestMeta, type: CrmRecordType, code: string): Promise<T> {
    const record = this.store(type).get(code);
    if (!record) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `${type} ${code} not found` });
    return structuredClone(record.payload) as T;
  }

  async create<T extends object>(_user: GatewayUser, _meta: GatewayRequestMeta, type: CrmRecordType, code: string, payload: T, indexes: CrmRecordIndexes = {}): Promise<T> { this.seed(type, code, payload, indexes); return structuredClone(payload); }
  async update<T extends object>(_user: GatewayUser, _meta: GatewayRequestMeta, type: CrmRecordType, code: string, payload: T, indexes: CrmRecordIndexes = {}): Promise<T> { if (!this.store(type).has(code)) await this.get(_user, _meta, type, code); this.seed(type, code, payload, indexes); return structuredClone(payload); }
  async remove(_user: GatewayUser, _meta: GatewayRequestMeta, type: CrmRecordType, code: string): Promise<void> { if (!this.store(type).delete(code)) await this.get(_user, _meta, type, code); }

  private store(type: CrmRecordType): Map<string, Stored> { let store = this.stores.get(type); if (!store) { store = new Map(); this.stores.set(type, store); } return store; }
}
