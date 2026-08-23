import { Injectable } from "@nestjs/common";
import { DEAL_STAGE_PROBABILITY, DEAL_STAGES, LEAD_STAGES, type CrmDialInput, type CrmDialResult, type CrmReferenceType, type CrmSettings, type UpdateCrmSettingsInput } from "@amni/shared";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmActivitiesService } from "./activities.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmCallLogsService } from "./call-logs.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

const SETTINGS_ID = "CRM-SETTINGS";
const PIPELINE_COLORS: Record<string, string> = { qualification: "#f59e0b", analysis: "#3b82f6", proposal: "#8b5cf6", negotiation: "#06b6d4", won: "#22c55e", lost: "#ef4444" };
const LEAD_STATUS_COLORS: Record<string, string> = { new: "#94a3b8", contacted: "#3b82f6", qualified: "#8b5cf6", proposal: "#f59e0b", won: "#22c55e", lost: "#ef4444" };

function defaults(): CrmSettings { return { brandName: "Amni CRM", defaultOwner: "", pipelineStages: DEAL_STAGES.map(({ value, label }) => ({ value, label, color: PIPELINE_COLORS[value] ?? "#64748b", probability: DEAL_STAGE_PROBABILITY[value as keyof typeof DEAL_STAGE_PROBABILITY] })), leadStatuses: LEAD_STAGES.map(({ value, label }) => ({ value, label, color: LEAD_STATUS_COLORS[value] ?? "#64748b" })), whatsapp: { enabled: false, accountName: "", defaultMessage: "Hi {{contact_name}}, this is {{sender_name}} from Amni." }, telephony: { provider: "internal", enabled: false, number: "", apiKeyMasked: "" }, emailAccount: { name: "", email: "", provider: "smtp", enabled: false, useSSL: false }, updatedAt: new Date().toISOString() }; }

@Injectable()
export class CrmSettingsService {
  constructor(private readonly records: CrmRecordRepository, private readonly callLogs: CrmCallLogsService, private readonly activities: CrmActivitiesService) {}
  async get(user: GatewayUser, meta: GatewayRequestMeta): Promise<CrmSettings> { return (await this.records.list<CrmSettings>(user, meta, "settings", { pageLength: 1 })).items[0] ?? defaults(); }
  async update(user: GatewayUser, meta: GatewayRequestMeta, input: UpdateCrmSettingsInput): Promise<CrmSettings> {
    const current = await this.get(user, meta);
    const settings: CrmSettings = { ...current, ...input, whatsapp: { ...current.whatsapp, ...input.whatsapp }, telephony: { ...current.telephony, ...input.telephony }, emailAccount: { ...current.emailAccount, ...input.emailAccount }, updatedAt: new Date().toISOString() };
    const existing = (await this.records.list<CrmSettings>(user, meta, "settings", { pageLength: 1 })).items.length > 0;
    return existing ? this.records.update(user, meta, "settings", SETTINGS_ID, settings, { title: "CRM Settings" }) : this.records.create(user, meta, "settings", SETTINGS_ID, settings, { title: "CRM Settings" });
  }
  async dial(user: GatewayUser, meta: GatewayRequestMeta, input: CrmDialInput): Promise<CrmDialResult> {
    const settings = await this.get(user, meta);
    const provider = settings.telephony.enabled ? settings.telephony.provider : "internal";
    const call = await this.callLogs.create(user, meta, { direction: "outbound", status: "ringing", phoneNumber: input.phoneNumber, agent: settings.defaultOwner || user.email, provider, notes: "Dialed from the CRM dialer." });
    if (input.referenceType && input.referenceCode) await this.activities.push(user, meta, "call", input.referenceType as CrmReferenceType, input.referenceCode, `Dialed ${input.phoneNumber}`, settings.defaultOwner || user.email);
    return { callId: call.id, provider, status: "ringing", message: provider === "internal" ? "Call placed via the built-in dialer" : `Call routed through ${provider}` };
  }
}
