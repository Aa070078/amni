import { expect, test } from "@playwright/test";

import { readE2EState } from "../support/state.js";

test.describe("Onboarding journey", () => {
  test("signs up, completes the setup wizard, and reaches provisioning status", async ({ page }) => {
    const state = readE2EState();
    test.skip(state.skipAll, state.skipReason ?? "E2E infrastructure unavailable");
    test.skip(!state.redisAvailable, "Wizard provisioning submit requires Redis (BullMQ enqueue)");

    const suffix = Date.now().toString(36);
    const email = `e2e.onboard.${suffix}@amni.dev`;
    const password = "Onboard12345!";
    const companyName = `E2E Onboard Co ${suffix}`;

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Onboarder");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Company name").fill(companyName);
    await page.getByLabel("Country code").fill("US");
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();

    // Signup auto-verifies the email in dev/test and lands on the app dashboard.
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Run the setup wizard. Company profile is step 1 of 6.
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: "Set up your workspace" })).toBeVisible();
    await expect(page.getByText("Step 1 of 6")).toBeVisible();
    await page.getByLabel("Company name").fill(companyName);

    for (let step = 1; step < 6; step += 1) {
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.getByText(`Step ${step + 1} of 6`)).toBeVisible();
    }

    // The wizard submit enqueues provisioning (BullMQ); without the worker the
    // tenant stays CREATING and the async provisioning card remains on screen.
    await page.getByRole("button", { name: "Set up workspace", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Provisioning your workspace" })).toBeVisible({
      timeout: 30_000,
    });
  });
});
