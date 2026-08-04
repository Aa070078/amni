export const PlatformRole = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

/**
 * Product-facing team roles in the setup wizard. Each maps to a bundle of
 * ERPNext roles at provisioning time (see packages/erp role bundles).
 */
export const ProductRole = {
  ADMIN: "admin",
  ACCOUNTANT: "accountant",
  SALES: "sales",
  INVENTORY: "inventory",
  MEMBER: "member",
} as const;

export type ProductRole = (typeof ProductRole)[keyof typeof ProductRole];

export const AppModule = {
  OVERVIEW: "overview",
  SALES: "sales",
  INVENTORY: "inventory",
  PURCHASING: "purchasing",
  FINANCE: "finance",
  PEOPLE: "people",
  SETTINGS: "settings",
} as const;

export type AppModule = (typeof AppModule)[keyof typeof AppModule];

export const BullQueue = {
  PROVISIONING: "provisioning",
  IMPORTS: "imports",
  MAIL: "mail",
  NOTIFY: "notify",
  DEFAULT: "default",
} as const;

export type BullQueue = (typeof BullQueue)[keyof typeof BullQueue];

export const PageSize = {
  DEFAULT: 20,
  MAX: 100,
} as const;

/** Tenant subdomain pattern used for site naming: `<slug>.<platform-domain>`. */
export const PLATFORM_DOMAIN_DEV = "localhost";
