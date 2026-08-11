export interface ProvisioningContext {
  tenantId: string;
  siteName: string;
  siteUrl: string;
  companyName: string;
  companyAbbreviation: string;
  country: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  language: string;
  serviceAccountEmail: string;
}

export interface StepResult {
  ok: boolean;
  detail?: string;
  host?: string;
  serviceKey?: string;
  /** Apps installed on the site (create_site step) — used to flag feature availability. */
  installApps?: string[];
}

export interface ProvisioningDriver {
  readonly name: string;
  preflight(ctx: ProvisioningContext): Promise<StepResult>;
  createSite(ctx: ProvisioningContext): Promise<StepResult>;
  configureCompany(ctx: ProvisioningContext): Promise<StepResult>;
  createServiceAccount(ctx: ProvisioningContext): Promise<StepResult>;
  createTenantAdmins(ctx: ProvisioningContext): Promise<StepResult>;
  validate(ctx: ProvisioningContext): Promise<StepResult>;
}
