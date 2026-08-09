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

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const REQUEST_SORT_WHITELIST = new Set(["code", "title", "documentType", "status", "createdAt", "updatedAt"]);
const TEMPLATE_SORT_WHITELIST = new Set(["code", "name", "documentType", "version", "status", "createdAt", "updatedAt"]);

const SEED_REQUESTS: SignRequest[] = [
  {
    code: "SIG-0001",
    title: "Facilities management retainer — annual renewal",
    documentType: "contract",
    documentCode: "CON-0102",
    status: "awaiting_signature",
    signers: [
      { code: "S-0001", name: "Nadia Rahman", email: "nadia@serenityinteriors.com", role: "Operations Director", status: "signed", signedAt: iso(3) },
      { code: "S-0002", name: "Owen Park", email: "owen@atlasfacilities.io", role: "Authorized Signatory", status: "pending" },
    ],
    expiresAt: iso(-8),
    createdBy: "Amara Osei",
    notes: "Signatures collected in order; first signer completed.",
    createdAt: iso(6),
    updatedAt: iso(3),
  },
  {
    code: "SIG-0002",
    title: "Q3 design services quotation approval",
    documentType: "quotation",
    documentCode: "QT-0041",
    status: "completed",
    signers: [
      { code: "S-0003", name: "Elif Yilmaz", email: "elif@luminasupplies.com", role: "Procurement Lead", status: "signed", signedAt: iso(9) },
      { code: "S-0004", name: "Mina Delacroix", email: "mina@demo.co", role: "Approver", status: "signed", signedAt: iso(9) },
    ],
    createdBy: "Theo Lindqvist",
    createdAt: iso(11),
    updatedAt: iso(9),
  },
  {
    code: "SIG-0003",
    title: "Priority support contract",
    documentType: "contract",
    documentCode: "CON-0110",
    status: "declined",
    signers: [
      { code: "S-0005", name: "Jonas Weber", email: "jonas@northwind.com", role: "Legal", status: "declined", signedAt: iso(14) },
    ],
    expiresAt: iso(-10),
    createdBy: "Amara Osei",
    notes: "Counterparty rejected terms; awaiting revised redline.",
    createdAt: iso(16),
    updatedAt: iso(14),
  },
  {
    code: "SIG-0004",
    title: "Sales invoice INV-0005 payment acknowledgment",
    documentType: "invoice",
    documentCode: "INV-0005",
    status: "sent",
    signers: [
      { code: "S-0006", name: "Atlas Facilities", email: "ar@atlasfacilities.io", role: "Accounts Payable", status: "pending" },
    ],
    createdBy: "Theo Lindqvist",
    createdAt: iso(2),
    updatedAt: iso(2),
  },
  {
    code: "SIG-0005",
    title: "Master services agreement — drafting",
    documentType: "proposal",
    documentCode: "PRP-0021",
    status: "draft",
    signers: [
      { code: "S-0007", name: "Harbor & Sage", email: "legal@harborsage.co", role: "General Counsel", status: "pending" },
      { code: "S-0008", name: "Amara Osei", email: "amara@demo.co", role: "CFO", status: "pending" },
    ],
    createdBy: "Amara Osei",
    createdAt: iso(1),
    updatedAt: iso(1),
  },
];

const SEED_TEMPLATES: SignTemplate[] = [
  { code: "STMP-0001", name: "Standard NDA", documentType: "contract", signerRoles: ["Counterparty"], version: 3, status: "active", createdAt: iso(200), updatedAt: iso(40) },
  { code: "STMP-0002", name: "Service agreement (2 parties)", documentType: "contract", signerRoles: ["Customer", "Internal approver"], version: 2, status: "active", createdAt: iso(180), updatedAt: iso(35) },
  { code: "STMP-0003", name: "Quotation acceptance", documentType: "quotation", signerRoles: ["Customer"], version: 1, status: "active", createdAt: iso(90), updatedAt: iso(90) },
  { code: "STMP-0004", name: "Legacy PO form", documentType: "purchase_order", signerRoles: ["Supplier"], version: 5, status: "archived", createdAt: iso(400), updatedAt: iso(200) },
];

const SEED_AUDIT: SignAuditEvent[] = [
  { id: "AUD-001", requestCode: "SIG-0001", event: "sent", actor: "Amara Osei", at: iso(6), detail: "Request sent to 2 signers" },
  { id: "AUD-002", requestCode: "SIG-0001", event: "signed", actor: "Nadia Rahman", at: iso(3), detail: "First signer completed" },
  { id: "AUD-003", requestCode: "SIG-0001", event: "viewed", actor: "Owen Park", at: iso(2) },
  { id: "AUD-004", requestCode: "SIG-0002", event: "completed", actor: "System", at: iso(9), detail: "All signers completed" },
  { id: "AUD-005", requestCode: "SIG-0003", event: "declined", actor: "Jonas Weber", at: iso(14), detail: "Terms rejected" },
  { id: "AUD-006", requestCode: "SIG-0003", event: "expired", actor: "System", at: iso(10), detail: "Request expired unactioned" },
];

function nextCode(records: { code: string }[], prefix: string): string {
  const max = records.reduce((highest, record) => {
    const number = Number(record.code.slice(prefix.length));
    return number > highest ? number : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function nextAuditId(records: SignAuditEvent[]): string {
  const max = records.reduce((highest, record) => {
    const number = Number(record.id.slice("AUD-".length));
    return number > highest ? number : highest;
  }, 0);
  return `AUD-${String(max + 1).padStart(4, "0")}`;
}

function sortValue<T>(record: T, sortBy: string): unknown {
  return record[sortBy as keyof T];
}

function sortRecords<T>(records: T[], sortBy: string, sortDir: "asc" | "desc"): T[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const aValue = sortValue(a, sortBy);
    const bValue = sortValue(b, sortBy);
    if (aValue === bValue) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    return aValue < bValue ? -1 * direction : direction;
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

/**
 * Reference data for the Demo Co tenant. Signature requests, templates and
 * the audit trail remain in-memory until the document-signing gateway lands.
 */
@Injectable()
export class SignService {
  private requests: SignRequest[] = structuredClone(SEED_REQUESTS);
  private templates: SignTemplate[] = structuredClone(SEED_TEMPLATES);
  private audit: SignAuditEvent[] = structuredClone(SEED_AUDIT);

  overview(): SignOverview {
    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "pending_for_me", label: "Pending for me", value: 2, format: "number", delta: 1, trend: "up", hint: "signatures I still owe" },
        { id: "awaiting_signature", label: "Awaiting signature", value: this.requests.filter((request) => request.status === "awaiting_signature").length, format: "number", hint: "requests waiting on the other side" },
        { id: "completed", label: "Completed", value: this.requests.filter((request) => request.status === "completed").length, format: "number", hint: "fully signed this quarter" },
        { id: "templates_active", label: "Active templates", value: this.templates.filter((template) => template.status === "active").length, format: "number", hint: "reusable signing flows" },
      ],
      pendingForMe: 2,
      awaitingSignature: this.requests.filter((request) => request.status === "awaiting_signature").length,
      completed: this.requests.filter((request) => request.status === "completed").length,
      templatesActive: this.templates.filter((template) => template.status === "active").length,
    };
  }

  listRequests(query: SignRequestListQuery): SignRequestListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.requests.filter((request) => {
      if (query.status && request.status !== query.status) return false;
      if (!q) return true;
      return [request.code, request.title, request.documentCode ?? "", ...request.signers.map((signer) => signer.name)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy && REQUEST_SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "desc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailRequest(code: string): SignRequest {
    const request = this.requests.find((record) => record.code === code);
    if (!request) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signature request ${code} not found` });
    }
    return request;
  }

  createRequest(input: CreateSignRequestInput): SignRequest {
    const now = new Date().toISOString();
    const request: SignRequest = {
      code: nextCode(this.requests, "SIG-"),
      title: input.title,
      documentType: input.documentType,
      documentCode: input.documentCode,
      status: "draft",
      signers: input.signers.map((signer, index) => ({
        code: `S-${String(index + 1).padStart(4, "0")}`,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        status: "pending",
      })),
      expiresAt: input.expiresAt,
      notes: input.notes,
      createdBy: "System",
      createdAt: now,
      updatedAt: now,
    };
    this.requests.push(request);
    return request;
  }

  updateRequest(code: string, input: UpdateSignRequestInput): SignRequest {
    const request = this.detailRequest(code);
    if (input.title !== undefined) request.title = input.title;
    if (input.documentType !== undefined) request.documentType = input.documentType;
    if (input.documentCode !== undefined) request.documentCode = input.documentCode;
    if (input.expiresAt !== undefined) request.expiresAt = input.expiresAt;
    if (input.notes !== undefined) request.notes = input.notes;
    if (input.signers !== undefined) {
      request.signers = input.signers.map((signer, index) => ({
        code: `S-${String(index + 1).padStart(4, "0")}`,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        status: "pending",
      }));
    }
    request.updatedAt = new Date().toISOString();
    return request;
  }

  changeRequestStatus(code: string, input: { status: SignRequestStatus }): SignRequest {
    const request = this.detailRequest(code);
    request.status = input.status;
    request.updatedAt = new Date().toISOString();
    this.audit.push({ id: nextAuditId(this.audit), requestCode: request.code, event: input.status === "completed" ? "completed" : "sent", actor: "System", at: request.updatedAt });
    return request;
  }

  markSignerSigned(code: string, signerCode: string): SignRequest {
    const request = this.detailRequest(code);
    const signer = request.signers.find((record) => record.code === signerCode);
    if (!signer) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signer ${signerCode} not found on ${code}` });
    }
    if (signer.status === "declined") {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: `Signer ${signerCode} already declined ${code}` });
    }
    const now = new Date().toISOString();
    signer.status = "signed";
    signer.signedAt = now;
    const allSigned = request.signers.every((record) => record.status === "signed");
    if (allSigned) request.status = "completed";
    request.updatedAt = now;
    this.audit.push({ id: nextAuditId(this.audit), requestCode: request.code, event: allSigned ? "completed" : "signed", actor: signer.name, at: now });
    return request;
  }

  declineRequest(code: string, input: DeclineSignRequestInput): SignRequest {
    const request = this.detailRequest(code);
    const signer = request.signers.find((record) => record.code === input.signerCode);
    if (!signer) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signer ${input.signerCode} not found on ${code}` });
    }
    const now = new Date().toISOString();
    signer.status = "declined";
    signer.signedAt = now;
    request.status = "declined";
    request.updatedAt = now;
    this.audit.push({ id: nextAuditId(this.audit), requestCode: request.code, event: "declined", actor: signer.name, at: now, detail: input.reason });
    return request;
  }

  removeRequest(code: string): void {
    const index = this.requests.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signature request ${code} not found` });
    }
    this.requests.splice(index, 1);
  }

  listTemplates(query: SignTemplateListQuery): SignTemplateListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.templates.filter((template) => {
      if (query.status && template.status !== query.status) return false;
      if (!q) return true;
      return [template.code, template.name, ...template.signerRoles].join(" ").toLowerCase().includes(q);
    });

    const sortBy = query.sortBy && TEMPLATE_SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "desc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailTemplate(code: string): SignTemplate {
    const template = this.templates.find((record) => record.code === code);
    if (!template) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signing template ${code} not found` });
    }
    return template;
  }

  createTemplate(input: CreateSignTemplateInput): SignTemplate {
    const now = new Date().toISOString();
    const template: SignTemplate = {
      code: nextCode(this.templates, "STMP-"),
      name: input.name,
      documentType: input.documentType,
      signerRoles: input.signerRoles,
      version: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.templates.push(template);
    return template;
  }

  updateTemplate(code: string, input: UpdateSignTemplateInput): SignTemplate {
    const template = this.detailTemplate(code);
    if (input.name !== undefined) template.name = input.name;
    if (input.documentType !== undefined) template.documentType = input.documentType;
    if (input.signerRoles !== undefined) template.signerRoles = input.signerRoles;
    template.version += 1;
    template.updatedAt = new Date().toISOString();
    return template;
  }

  changeTemplateStatus(code: string, input: { status: SignTemplateStatus }): SignTemplate {
    const template = this.detailTemplate(code);
    template.status = input.status;
    template.updatedAt = new Date().toISOString();
    return template;
  }

  removeTemplate(code: string): void {
    const index = this.templates.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Signing template ${code} not found` });
    }
    this.templates.splice(index, 1);
  }

  listAudit(query: SignAuditListQuery): SignAuditResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.audit.filter((event) => {
      if (!q) return true;
      return [event.requestCode, event.event, event.actor ?? "", event.detail ?? ""].join(" ").toLowerCase().includes(q);
    });

    const sorted = sortRecords(filtered, "at", "desc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }
}
