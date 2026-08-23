import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateSignRequestInput,
  type CreateSignTemplateInput,
  type DeclineSignRequestInput,
  type SignAuditEvent,
  type SignAuditListQuery,
  type SignAuditResponse,
  type SignOverview,
  type SignRequest,
  type SignRequestListQuery,
  type SignRequestListResponse,
  type SignRequestStatus,
  type SignTemplate,
  type SignTemplateListQuery,
  type SignTemplateListResponse,
  type SignTemplateStatus,
  type UpdateSignRequestInput,
  type UpdateSignTemplateInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
// DomainRecordRepository must remain a value import for Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DomainRecordRepository } from "../common/domain-record.repository";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";

function sortRecords<T>(records: T[], sortBy: string, sortDir: "asc" | "desc"): T[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const left = a[sortBy as keyof T];
    const right = b[sortBy as keyof T];
    if (left === right) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left < right ? -direction : direction;
  });
}

function page<T>(items: T[], pageNumber: number, pageSize: number): { items: T[]; total: number } {
  const start = (pageNumber - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

const newCode = (prefix: string): string => `${prefix}${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;

@Injectable()
export class SignService {
  constructor(private readonly records: DomainRecordRepository) {}

  async overview(user: GatewayUser, meta: GatewayRequestMeta): Promise<SignOverview> {
    const [requests, templates] = await Promise.all([this.all<SignRequest>(user, meta, "request"), this.all<SignTemplate>(user, meta, "template")]);
    const pendingForMe = requests.reduce((total, request) => total + request.signers.filter((signer) => signer.status === "pending").length, 0);
    const awaitingSignature = requests.filter((request) => request.status === "awaiting_signature").length;
    const completed = requests.filter((request) => request.status === "completed").length;
    const templatesActive = templates.filter((template) => template.status === "active").length;
    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "pending_for_me", label: "Pending signatures", value: pendingForMe, format: "number", hint: "signatures still outstanding" },
        { id: "awaiting_signature", label: "Awaiting signature", value: awaitingSignature, format: "number", hint: "requests waiting on signers" },
        { id: "completed", label: "Completed", value: completed, format: "number", hint: "fully signed requests" },
        { id: "templates_active", label: "Active templates", value: templatesActive, format: "number", hint: "reusable signing flows" },
      ],
      pendingForMe,
      awaitingSignature,
      completed,
      templatesActive,
    };
  }

  async listRequests(user: GatewayUser, meta: GatewayRequestMeta, query: SignRequestListQuery): Promise<SignRequestListResponse> {
    const q = (query.q ?? "").toLowerCase().trim();
    const records = (await this.all<SignRequest>(user, meta, "request")).filter((item) => (!query.status || item.status === query.status) && (!q || `${item.code} ${item.title} ${item.documentCode ?? ""} ${item.signers.map((signer) => signer.name).join(" ")}`.toLowerCase().includes(q)));
    const result = page(sortRecords(records, query.sortBy ?? "createdAt", query.sortDir ?? "desc"), query.page, query.pageSize);
    return { items: result.items, meta: { total: result.total, page: query.page, pageSize: query.pageSize } };
  }

  detailRequest(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<SignRequest> {
    return this.records.get(user, meta, "sign", "request", code);
  }

  async createRequest(user: GatewayUser, meta: GatewayRequestMeta, input: CreateSignRequestInput): Promise<SignRequest> {
    const now = new Date().toISOString();
    const request: SignRequest = { code: newCode("SIG-"), title: input.title, documentType: input.documentType, documentCode: input.documentCode, status: "draft", signers: input.signers.map((signer, index) => ({ code: `S-${String(index + 1).padStart(4, "0")}`, ...signer, status: "pending" })), expiresAt: input.expiresAt, notes: input.notes, createdBy: user.email, createdAt: now, updatedAt: now };
    return this.saveRequest(user, meta, request, true);
  }

  async updateRequest(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateSignRequestInput): Promise<SignRequest> {
    const request = await this.detailRequest(user, meta, code);
    const { signers, ...values } = input;
    Object.assign(request, values);
    if (signers) request.signers = signers.map((signer, index) => ({ code: `S-${String(index + 1).padStart(4, "0")}`, ...signer, status: "pending" }));
    request.updatedAt = new Date().toISOString();
    return this.saveRequest(user, meta, request, false);
  }

  async changeRequestStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: SignRequestStatus }): Promise<SignRequest> {
    const request = await this.detailRequest(user, meta, code);
    request.status = input.status;
    request.updatedAt = new Date().toISOString();
    const saved = await this.saveRequest(user, meta, request, false);
    await this.addAudit(user, meta, request.code, input.status === "completed" ? "completed" : "sent", user.email, request.updatedAt);
    return saved;
  }

  async markSignerSigned(user: GatewayUser, meta: GatewayRequestMeta, code: string, signerCode: string): Promise<SignRequest> {
    const request = await this.detailRequest(user, meta, code);
    const signer = request.signers.find((item) => item.code === signerCode);
    if (!signer) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signer ${signerCode} not found on ${code}` });
    if (signer.status === "declined") throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: `Signer ${signerCode} already declined ${code}` });
    const now = new Date().toISOString();
    signer.status = "signed";
    signer.signedAt = now;
    const completed = request.signers.every((item) => item.status === "signed");
    if (completed) request.status = "completed";
    request.updatedAt = now;
    const saved = await this.saveRequest(user, meta, request, false);
    await this.addAudit(user, meta, request.code, completed ? "completed" : "signed", signer.name, now);
    return saved;
  }

  async declineRequest(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: DeclineSignRequestInput): Promise<SignRequest> {
    const request = await this.detailRequest(user, meta, code);
    const signer = request.signers.find((item) => item.code === input.signerCode);
    if (!signer) throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signer ${input.signerCode} not found on ${code}` });
    const now = new Date().toISOString();
    signer.status = "declined";
    signer.signedAt = now;
    request.status = "declined";
    request.updatedAt = now;
    const saved = await this.saveRequest(user, meta, request, false);
    await this.addAudit(user, meta, request.code, "declined", signer.name, now, input.reason);
    return saved;
  }

  removeRequest(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    return this.records.remove(user, meta, "sign", "request", code);
  }

  async listTemplates(user: GatewayUser, meta: GatewayRequestMeta, query: SignTemplateListQuery): Promise<SignTemplateListResponse> {
    const q = (query.q ?? "").toLowerCase().trim();
    const records = (await this.all<SignTemplate>(user, meta, "template")).filter((item) => (!query.status || item.status === query.status) && (!q || `${item.code} ${item.name} ${item.signerRoles.join(" ")}`.toLowerCase().includes(q)));
    const result = page(sortRecords(records, query.sortBy ?? "createdAt", query.sortDir ?? "desc"), query.page, query.pageSize);
    return { items: result.items, meta: { total: result.total, page: query.page, pageSize: query.pageSize } };
  }

  templateDetail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<SignTemplate> {
    return this.records.get(user, meta, "sign", "template", code);
  }

  async createTemplate(user: GatewayUser, meta: GatewayRequestMeta, input: CreateSignTemplateInput): Promise<SignTemplate> {
    const now = new Date().toISOString();
    const template: SignTemplate = { code: newCode("STMP-"), ...input, version: 1, status: "active", createdAt: now, updatedAt: now };
    return this.saveTemplate(user, meta, template, true);
  }

  async updateTemplate(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateSignTemplateInput): Promise<SignTemplate> {
    const template = await this.templateDetail(user, meta, code);
    Object.assign(template, input);
    template.version += 1;
    template.updatedAt = new Date().toISOString();
    return this.saveTemplate(user, meta, template, false);
  }

  async changeTemplateStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: SignTemplateStatus }): Promise<SignTemplate> {
    const template = await this.templateDetail(user, meta, code);
    template.status = input.status;
    template.updatedAt = new Date().toISOString();
    return this.saveTemplate(user, meta, template, false);
  }

  removeTemplate(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    return this.records.remove(user, meta, "sign", "template", code);
  }

  async listAudit(user: GatewayUser, meta: GatewayRequestMeta, query: SignAuditListQuery): Promise<SignAuditResponse> {
    const q = (query.q ?? "").toLowerCase().trim();
    const records = (await this.all<SignAuditEvent>(user, meta, "audit")).filter((item) => !q || `${item.requestCode} ${item.event} ${item.actor ?? ""} ${item.detail ?? ""}`.toLowerCase().includes(q));
    const result = page(sortRecords(records, "at", "desc"), query.page, query.pageSize);
    return { items: result.items, meta: { total: result.total, page: query.page, pageSize: query.pageSize } };
  }

  private async all<T>(user: GatewayUser, meta: GatewayRequestMeta, recordType: string): Promise<T[]> {
    return (await this.records.list<T>(user, meta, "sign", recordType, { pageLength: 100 })).items;
  }

  private saveRequest(user: GatewayUser, meta: GatewayRequestMeta, request: SignRequest, create: boolean): Promise<SignRequest> {
    const indexes = { title: request.title, status: request.status, category: request.documentType, referenceCode: request.documentCode, eventAt: request.expiresAt, searchText: `${request.code} ${request.title} ${request.documentCode ?? ""} ${request.signers.map((signer) => `${signer.name} ${signer.email}`).join(" ")}` };
    return create ? this.records.create(user, meta, "sign", "request", request.code, request, indexes) : this.records.update(user, meta, "sign", "request", request.code, request, indexes);
  }

  private saveTemplate(user: GatewayUser, meta: GatewayRequestMeta, template: SignTemplate, create: boolean): Promise<SignTemplate> {
    const indexes = { title: template.name, status: template.status, category: template.documentType, numericValue: template.version, searchText: `${template.code} ${template.name} ${template.signerRoles.join(" ")}` };
    return create ? this.records.create(user, meta, "sign", "template", template.code, template, indexes) : this.records.update(user, meta, "sign", "template", template.code, template, indexes);
  }

  private addAudit(user: GatewayUser, meta: GatewayRequestMeta, requestCode: string, event: SignAuditEvent["event"], actor: string, at: string, detail?: string): Promise<SignAuditEvent> {
    const audit: SignAuditEvent = { id: randomUUID(), requestCode, event, actor, at, detail };
    return this.records.create(user, meta, "sign", "audit", audit.id, audit, { status: event, referenceCode: requestCode, eventAt: at, searchText: `${requestCode} ${event} ${actor} ${detail ?? ""}` });
  }
}
