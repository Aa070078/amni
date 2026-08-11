import { defineConfig } from "vitest/config";

/**
 * Dedicated tenant isolation suite (TESTING.md §5). Runs only the
 * `*.isolation.spec.ts` files so the mandatory cross-tenant 403/404 checks
 * can be executed quickly and in isolation from the unit suite.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.isolation.spec.ts"],
    testTimeout: 15_000,
  },
});
