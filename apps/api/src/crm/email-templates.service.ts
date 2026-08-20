import { Injectable } from "@nestjs/common";
import type { CreateCrmEmailTemplateInput, CrmEmailTemplate, CrmEmailTemplateListResponse, CrmEmailTemplatePreview, CrmEmailTemplatePreviewInput, UpdateCrmEmailTemplateInput } from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

@Injectable()
export class CrmEmailTemplatesService {
  constructor(private readonly records: CrmRecordRepository) {}

  async list(user: GatewayUser, meta: GatewayRequestMeta): Promise<CrmEmailTemplateListResponse> { return { items: (await this.records.list<CrmEmailTemplate>(user, meta, "email_template", { orderBy: "title asc", pageLength: 100 })).items }; }
  detail(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<CrmEmailTemplate> { return this.records.get(user, meta, "email_template", id); }
  create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCrmEmailTemplateInput): Promise<CrmEmailTemplate> {
    const template: CrmEmailTemplate = { id: newId("etp"), name: input.name, subject: input.subject, body: input.body, referenceType: input.referenceType, createdAt: new Date().toISOString() };
    return this.records.create(user, meta, "email_template", template.id, template, indexesFor(template));
  }
  async update(user: GatewayUser, meta: GatewayRequestMeta, id: string, input: UpdateCrmEmailTemplateInput): Promise<CrmEmailTemplate> { const template = { ...(await this.detail(user, meta, id)), ...input, id }; return this.records.update(user, meta, "email_template", id, template, indexesFor(template)); }
  remove(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<void> { return this.records.remove(user, meta, "email_template", id); }
  async preview(user: GatewayUser, meta: GatewayRequestMeta, input: CrmEmailTemplatePreviewInput): Promise<CrmEmailTemplatePreview> { const template = await this.detail(user, meta, input.templateId); return { subject: render(template.subject, input.variables), body: render(template.body, input.variables) }; }
}

function indexesFor(template: CrmEmailTemplate) { return { title: template.name, category: template.referenceType, searchText: [template.name, template.subject, template.body].join(" ") }; }
function render(template: string, variables: Record<string, string>): string { return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? `{{${key}}}`); }
