/** Shared addresses + test-only fixtures for the e2e suite. */

export const API_PORT = 4000;
export const WEB_PORT = 3100;

export const API_BASE_URL = `http://localhost:${API_PORT}`;
export const API_V1_URL = `${API_BASE_URL}/api/v1`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

/**
 * Test-only AES-256 master key (64 hex chars = 32 bytes). The API webServer is
 * launched with this exact value so it can decrypt the seeded ERPInstance
 * service secret (packages/erp/src/crypto.ts). Never used outside e2e.
 */
export const E2E_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export const MOCK_ERP_API_KEY = "e2e-service-account";
export const MOCK_ERP_API_SECRET = "e2e-secret-7f3a9c2d";
