import type {
  CrmActivity,
  CreateCrmCallLogInput,
  CreateCrmCommentInput,
  CreateCrmEmailTemplateInput,
  CreateCrmEventInput,
  CreateCrmNoteInput,
  CreateCrmStatusActivityInput,
  CreateCrmTaskInput,
  CreateCrmViewInput,
  CreateOrganizationInput,
  CrmActivityListQuery,
  CrmActivityListResponse,
  CrmCallLog,
  CrmCallLogListQuery,
  CrmCallLogListResponse,
  CrmDialInput,
  CrmDialResult,
  CrmEmailTemplate,
  CrmEmailTemplateListResponse,
  CrmEmailTemplatePreview,
  CrmEmailTemplatePreviewInput,
  CrmEvent,
  CrmEventListQuery,
  CrmEventListResponse,
  CrmNote,
  CrmNoteListQuery,
  CrmNoteListResponse,
  CrmSettings,
  CrmTask,
  CrmTaskBoard,
  CrmTaskListQuery,
  CrmTaskListResponse,
  CrmTaskStatus,
  CrmView,
  CrmViewListQuery,
  CrmViewListResponse,
  CrmWhatsappHistoryQuery,
  CrmWhatsappHistoryResponse,
  CrmWhatsappResponse,
  Notification,
  NotificationsResponse,
  Organization,
  OrganizationDetail,
  OrganizationListQuery,
  OrganizationListResponse,
  SendCrmWhatsappInput,
  UpdateCrmCallLogInput,
  UpdateCrmEmailTemplateInput,
  UpdateCrmEventInput,
  UpdateCrmNoteInput,
  UpdateCrmSettingsInput,
  UpdateCrmTaskInput,
  UpdateCrmViewInput,
  UpdateOrganizationInput,
  UpdateCrmContactInput,
  CreateCrmContactInput,
  CrmContact,
  CrmContactListQuery,
  CrmContactListResponse,
} from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

const BASE = "/sales/crm";

export const crmClient = {
  organizations: {
    list(query: Partial<OrganizationListQuery> = {}): Promise<OrganizationListResponse> {
      return apiRequest<OrganizationListResponse>(BASE, `/organizations${toQueryString(query)}`);
    },
    detail(code: string): Promise<OrganizationDetail> {
      return apiRequest<OrganizationDetail>(BASE, `/organizations/${encodeURIComponent(code)}`);
    },
    create(input: CreateOrganizationInput): Promise<Organization> {
      return apiRequest<Organization>(BASE, "/organizations", { method: "POST", body: input });
    },
    update(code: string, input: UpdateOrganizationInput): Promise<Organization> {
      return apiRequest<Organization>(BASE, `/organizations/${encodeURIComponent(code)}`, {
        method: "PATCH",
        body: input,
      });
    },
    remove(code: string): Promise<void> {
      return apiRequest<void>(BASE, `/organizations/${encodeURIComponent(code)}`, { method: "DELETE" });
    },
  },
  contacts: {
    list(query: Partial<CrmContactListQuery> = {}): Promise<CrmContactListResponse> {
      return apiRequest<CrmContactListResponse>(BASE, `/contacts${toQueryString(query)}`);
    },
    detail(code: string): Promise<CrmContact> {
      return apiRequest<CrmContact>(BASE, `/contacts/${encodeURIComponent(code)}`);
    },
    create(input: CreateCrmContactInput): Promise<CrmContact> {
      return apiRequest<CrmContact>(BASE, "/contacts", { method: "POST", body: input });
    },
    update(code: string, input: UpdateCrmContactInput): Promise<CrmContact> {
      return apiRequest<CrmContact>(BASE, `/contacts/${encodeURIComponent(code)}`, {
        method: "PATCH",
        body: input,
      });
    },
    remove(code: string): Promise<void> {
      return apiRequest<void>(BASE, `/contacts/${encodeURIComponent(code)}`, { method: "DELETE" });
    },
  },
  tasks: {
    board(): Promise<CrmTaskBoard> {
      return apiRequest<CrmTaskBoard>(BASE, "/tasks/board");
    },
    list(query: Partial<CrmTaskListQuery> = {}): Promise<CrmTaskListResponse> {
      return apiRequest<CrmTaskListResponse>(BASE, `/tasks${toQueryString(query)}`);
    },
    detail(code: string): Promise<CrmTask> {
      return apiRequest<CrmTask>(BASE, `/tasks/${encodeURIComponent(code)}`);
    },
    create(input: CreateCrmTaskInput): Promise<CrmTask> {
      return apiRequest<CrmTask>(BASE, "/tasks", { method: "POST", body: input });
    },
    updateStatus(code: string, status: CrmTaskStatus): Promise<CrmTask> {
      return apiRequest<CrmTask>(BASE, `/tasks/${encodeURIComponent(code)}/status`, {
        method: "PATCH",
        body: { status },
      });
    },
    update(code: string, input: UpdateCrmTaskInput): Promise<CrmTask> {
      return apiRequest<CrmTask>(BASE, `/tasks/${encodeURIComponent(code)}`, { method: "PATCH", body: input });
    },
    remove(code: string): Promise<void> {
      return apiRequest<void>(BASE, `/tasks/${encodeURIComponent(code)}`, { method: "DELETE" });
    },
  },
  notes: {
    list(query: Partial<CrmNoteListQuery> = {}): Promise<CrmNoteListResponse> {
      return apiRequest<CrmNoteListResponse>(BASE, `/notes${toQueryString(query)}`);
    },
    detail(code: string): Promise<CrmNote> {
      return apiRequest<CrmNote>(BASE, `/notes/${encodeURIComponent(code)}`);
    },
    create(input: CreateCrmNoteInput): Promise<CrmNote> {
      return apiRequest<CrmNote>(BASE, "/notes", { method: "POST", body: input });
    },
    update(code: string, input: UpdateCrmNoteInput): Promise<CrmNote> {
      return apiRequest<CrmNote>(BASE, `/notes/${encodeURIComponent(code)}`, { method: "PATCH", body: input });
    },
    remove(code: string): Promise<void> {
      return apiRequest<void>(BASE, `/notes/${encodeURIComponent(code)}`, { method: "DELETE" });
    },
  },
  activities: {
    list(query: CrmActivityListQuery): Promise<CrmActivityListResponse> {
      return apiRequest<CrmActivityListResponse>(BASE, `/activities${toQueryString(query)}`);
    },
    comment(input: CreateCrmCommentInput): Promise<CrmActivity> {
      return apiRequest<CrmActivity>(BASE, "/activities/comments", { method: "POST", body: input });
    },
    status(input: CreateCrmStatusActivityInput): Promise<CrmActivity> {
      return apiRequest<CrmActivity>(BASE, "/activities/status", { method: "POST", body: input });
    },
  },
  callLogs: {
    list(query: Partial<CrmCallLogListQuery> = {}): Promise<CrmCallLogListResponse> {
      return apiRequest<CrmCallLogListResponse>(BASE, `/call-logs${toQueryString(query)}`);
    },
    detail(id: string): Promise<CrmCallLog> {
      return apiRequest<CrmCallLog>(BASE, `/call-logs/${encodeURIComponent(id)}`);
    },
    create(input: CreateCrmCallLogInput): Promise<CrmCallLog> {
      return apiRequest<CrmCallLog>(BASE, "/call-logs", { method: "POST", body: input });
    },
    update(id: string, input: UpdateCrmCallLogInput): Promise<CrmCallLog> {
      return apiRequest<CrmCallLog>(BASE, `/call-logs/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
    },
    remove(id: string): Promise<void> {
      return apiRequest<void>(BASE, `/call-logs/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  },
  emailTemplates: {
    list(): Promise<CrmEmailTemplateListResponse> {
      return apiRequest<CrmEmailTemplateListResponse>(BASE, "/email-templates");
    },
    preview(input: CrmEmailTemplatePreviewInput): Promise<CrmEmailTemplatePreview> {
      return apiRequest<CrmEmailTemplatePreview>(BASE, "/email-templates/preview", {
        method: "POST",
        body: input,
      });
    },
    detail(id: string): Promise<CrmEmailTemplate> {
      return apiRequest<CrmEmailTemplate>(BASE, `/email-templates/${encodeURIComponent(id)}`);
    },
    create(input: CreateCrmEmailTemplateInput): Promise<CrmEmailTemplate> {
      return apiRequest<CrmEmailTemplate>(BASE, "/email-templates", { method: "POST", body: input });
    },
    update(id: string, input: UpdateCrmEmailTemplateInput): Promise<CrmEmailTemplate> {
      return apiRequest<CrmEmailTemplate>(BASE, `/email-templates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
      });
    },
    remove(id: string): Promise<void> {
      return apiRequest<void>(BASE, `/email-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  },
  events: {
    list(query: CrmEventListQuery = {}): Promise<CrmEventListResponse> {
      return apiRequest<CrmEventListResponse>(BASE, `/events${toQueryString(query)}`);
    },
    detail(id: string): Promise<CrmEvent> {
      return apiRequest<CrmEvent>(BASE, `/events/${encodeURIComponent(id)}`);
    },
    create(input: CreateCrmEventInput): Promise<CrmEvent> {
      return apiRequest<CrmEvent>(BASE, "/events", { method: "POST", body: input });
    },
    update(id: string, input: UpdateCrmEventInput): Promise<CrmEvent> {
      return apiRequest<CrmEvent>(BASE, `/events/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
    },
    remove(id: string): Promise<void> {
      return apiRequest<void>(BASE, `/events/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  },
  views: {
    list(query: CrmViewListQuery = {}): Promise<CrmViewListResponse> {
      return apiRequest<CrmViewListResponse>(BASE, `/views${toQueryString(query)}`);
    },
    detail(id: string): Promise<CrmView> {
      return apiRequest<CrmView>(BASE, `/views/${encodeURIComponent(id)}`);
    },
    create(input: CreateCrmViewInput): Promise<CrmView> {
      return apiRequest<CrmView>(BASE, "/views", { method: "POST", body: input });
    },
    update(id: string, input: UpdateCrmViewInput): Promise<CrmView> {
      return apiRequest<CrmView>(BASE, `/views/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
    },
    remove(id: string): Promise<void> {
      return apiRequest<void>(BASE, `/views/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  },
  whatsapp: {
    send(input: SendCrmWhatsappInput): Promise<CrmWhatsappResponse> {
      return apiRequest<CrmWhatsappResponse>(BASE, "/whatsapp/send", { method: "POST", body: input });
    },
    history(query: Partial<CrmWhatsappHistoryQuery> = {}): Promise<CrmWhatsappHistoryResponse> {
      return apiRequest<CrmWhatsappHistoryResponse>(BASE, `/whatsapp/history${toQueryString({ limit: 50, ...query })}`);
    },
  },
  notifications: {
    list(): Promise<NotificationsResponse> {
      return apiRequest<NotificationsResponse>(BASE, "/notifications");
    },
    markRead(id: string): Promise<Notification> {
      return apiRequest<Notification>(BASE, `/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
      });
    },
    markAllRead(): Promise<NotificationsResponse> {
      return apiRequest<NotificationsResponse>(BASE, "/notifications/read-all", { method: "PATCH" });
    },
  },
  settings: {
    get(): Promise<CrmSettings> {
      return apiRequest<CrmSettings>(BASE, "/settings");
    },
    update(input: UpdateCrmSettingsInput): Promise<CrmSettings> {
      return apiRequest<CrmSettings>(BASE, "/settings", { method: "PATCH", body: input });
    },
    dial(input: CrmDialInput): Promise<CrmDialResult> {
      return apiRequest<CrmDialResult>(BASE, "/settings/dial", { method: "POST", body: input });
    },
  },
};

export function formatCrmDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function formatCrmDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
