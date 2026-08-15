import { Injectable } from "@nestjs/common";
import {
  DEAL_STAGE_PROBABILITY,
  DEAL_STAGES,
  LEAD_STAGES,
  type CrmDialInput,
  type CrmDialResult,
  type CrmReferenceType,
  type CrmSettings,
  type UpdateCrmSettingsInput,
} from "@amni/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmActivitiesService } from "./activities.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmCallLogsService } from "./call-logs.service";

const PIPELINE_COLORS: Record<string, string> = {
  qualification: "#f59e0b",
  analysis: "#3b82f6",
  proposal: "#8b5cf6",
  negotiation: "#06b6d4",
  won: "#22c55e",
  lost: "#ef4444",
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#94a3b8",
  contacted: "#3b82f6",
  qualified: "#8b5cf6",
  proposal: "#f59e0b",
  won: "#22c55e",
  lost: "#ef4444",
};

function defaults(): CrmSettings {
  return {
    brandName: "Amni CRM",
    defaultOwner: "Amara Osei",
    pipelineStages: DEAL_STAGES.map(({ value, label }) => ({
      value,
      label,
      color: PIPELINE_COLORS[value] ?? "#64748b",
      probability: DEAL_STAGE_PROBABILITY[value as keyof typeof DEAL_STAGE_PROBABILITY],
    })),
    leadStatuses: LEAD_STAGES.map(({ value, label }) => ({
      value,
      label,
      color: LEAD_STATUS_COLORS[value] ?? "#64748b",
    })),
    whatsapp: {
      enabled: false,
      accountName: "",
      defaultMessage: "Hi {{contact_name}}, this is {{sender_name}} from Amni.",
    },
    telephony: {
      provider: "internal",
      enabled: false,
      number: "",
      apiKeyMasked: "",
    },
    emailAccount: {
      name: "",
      email: "",
      provider: "smtp",
      enabled: false,
      useSSL: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

@Injectable()
export class CrmSettingsService {
  private settings: CrmSettings = defaults();

  constructor(
    private readonly callLogs: CrmCallLogsService,
    private readonly activities: CrmActivitiesService,
  ) {}

  get(): CrmSettings {
    return this.settings;
  }

  update(input: UpdateCrmSettingsInput): CrmSettings {
    if (input.brandName !== undefined) this.settings.brandName = input.brandName;
    if (input.defaultOwner !== undefined) this.settings.defaultOwner = input.defaultOwner;
    if (input.pipelineStages !== undefined) this.settings.pipelineStages = input.pipelineStages;
    if (input.leadStatuses !== undefined) this.settings.leadStatuses = input.leadStatuses;
    if (input.whatsapp) Object.assign(this.settings.whatsapp, input.whatsapp);
    if (input.telephony) Object.assign(this.settings.telephony, input.telephony);
    if (input.emailAccount) Object.assign(this.settings.emailAccount, input.emailAccount);
    this.settings.updatedAt = new Date().toISOString();
    return this.settings;
  }

  dial(input: CrmDialInput): CrmDialResult {
    const provider = this.settings.telephony.enabled ? this.settings.telephony.provider : "internal";
    const call = this.callLogs.create({
      direction: "outbound",
      status: "ringing",
      phoneNumber: input.phoneNumber,
      agent: this.settings.defaultOwner || "Amara Osei",
      provider,
      notes: "Dialed from the CRM dialer.",
    });
    if (input.referenceType && input.referenceCode) {
      this.activities.push(
        "call",
        input.referenceType as CrmReferenceType,
        input.referenceCode,
        `Dialed ${input.phoneNumber}`,
        this.settings.defaultOwner || "Amara Osei",
      );
    }
    return {
      callId: call.id,
      provider,
      status: "ringing",
      message: provider === "internal" ? "Call placed via the built-in dialer" : `Call routed through ${provider}`,
    };
  }
}
