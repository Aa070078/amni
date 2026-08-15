import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCrmEmailTemplateInput,
  type CrmEmailTemplate,
  type CrmEmailTemplateListResponse,
  type CrmEmailTemplatePreview,
  type CrmEmailTemplatePreviewInput,
  type UpdateCrmEmailTemplateInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { iso, newId } from "./crm-common";

const SEED: CrmEmailTemplate[] = [
  { id: "etp-intro", name: "Introduction", subject: "Intro — {{company}}", body: "Hi {{contact_name}},\n\nI help teams at {{company}} equip their spaces. Would you be open to a quick call this week?\n\nBest,\n{{sender_name}}", referenceType: "lead", createdAt: iso(60) },
  { id: "etp-follow-up", name: "Follow up", subject: "Following up — {{company}}", body: "Hi {{contact_name}},\n\nJust checking in on {{subject}}. Let me know if you have any questions.\n\nBest,\n{{sender_name}}", referenceType: "lead", createdAt: iso(50) },
  { id: "etp-proposal", name: "Proposal", subject: "Proposal for {{company}}", body: "Hi {{contact_name}},\n\nHere is the proposal we discussed, covering {{scope}}. I'd love to walk through it together.\n\nBest,\n{{sender_name}}", referenceType: "deal", createdAt: iso(40) },
  { id: "etp-meeting", name: "Meeting request", subject: "Meeting — {{company}}", body: "Hi {{contact_name}},\n\nShall we find time to review the {{scope}} this week?\n\nBest,\n{{sender_name}}", referenceType: "deal", createdAt: iso(30) },
];

@Injectable()
export class CrmEmailTemplatesService {
  private records: CrmEmailTemplate[] = structuredClone(SEED);

  list(): CrmEmailTemplateListResponse {
    return { items: this.records };
  }

  detail(id: string): CrmEmailTemplate {
    return this.find(id);
  }

  create(input: CreateCrmEmailTemplateInput): CrmEmailTemplate {
    const template: CrmEmailTemplate = {
      id: newId("etp"),
      name: input.name,
      subject: input.subject,
      body: input.body,
      referenceType: input.referenceType,
      createdAt: new Date().toISOString(),
    };
    this.records.push(template);
    return template;
  }

  update(id: string, input: UpdateCrmEmailTemplateInput): CrmEmailTemplate {
    const template = this.find(id);
    if (input.name !== undefined) template.name = input.name;
    if (input.subject !== undefined) template.subject = input.subject;
    if (input.body !== undefined) template.body = input.body;
    if (input.referenceType !== undefined) template.referenceType = input.referenceType;
    return template;
  }

  remove(id: string): void {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Email template ${id} not found` });
    }
    this.records.splice(index, 1);
  }

  preview(input: CrmEmailTemplatePreviewInput): CrmEmailTemplatePreview {
    const template = this.find(input.templateId);
    return {
      subject: render(template.subject, input.variables),
      body: render(template.body, input.variables),
    };
  }

  private find(id: string): CrmEmailTemplate {
    const template = this.records.find((record) => record.id === id);
    if (!template) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Email template ${id} not found` });
    }
    return template;
  }
}

function render(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? `{{${key}}}`);
}
