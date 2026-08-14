import { z } from "zod";

/**
 * HRMS (Frappe HR) embed — SSO bridge contract.
 *
 * The Amni web UI embeds the tenant's Frappe HR desk in an iframe. The API
 * never exposes ERP credentials; it only mints a short-lived, audience-scoped
 * JWT that `amni_bridge.api.login` on the tenant site exchanges for a desk
 * session cookie. See DEVELOPMENT.md "HRMS (Frappe HR) section".
 */

export const hrmsStatusSchema = z.object({
  /** Whether HRMS was installed at provision time (Tenant.hrmsInstalled). */
  available: z.boolean(),
  /** Tenant must be ACTIVE for the desk to be reachable. */
  tenantActive: z.boolean(),
  /** Tenant site origin (https://<site>.<domain>) — the iframe host. */
  siteUrl: z.string().url().optional(),
  /** Initial desk page to open after SSO. */
  deskPath: z.string().default("/app/hrms"),
});

export const hrmsSsoUrlQuerySchema = z.object({
  /** Desk path to land on after sign-in (must start with a single "/"). */
  return: z
    .string()
    .regex(/^\/(?!\/)/, { message: "return must be a single-slash absolute path" })
    .max(500)
    .optional(),
});

export const hrmsSsoUrlResponseSchema = z.object({
  /** URL the /hrms iframe should load to establish the desk session. */
  url: z.string().url(),
  siteUrl: z.string().url(),
  /** Seconds until the sign-in token expires. */
  tokenExpiresIn: z.number().int().positive(),
});

export type HrmsStatus = z.infer<typeof hrmsStatusSchema>;
export type HrmsSsoUrlQuery = z.infer<typeof hrmsSsoUrlQuerySchema>;
export type HrmsSsoUrlResponse = z.infer<typeof hrmsSsoUrlResponseSchema>;
