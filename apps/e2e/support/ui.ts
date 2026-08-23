import { expect, type Locator, type Page } from "@playwright/test";

/** Logs in through the real login form and waits for the dashboard redirect. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
}

/** Navigates to a list page and opens its create dialog (header or empty-state trigger). */
export async function openDialog(page: Page, path: string, triggerName: string): Promise<Locator> {
  await page.goto(path);
  const trigger = page.getByRole("button", { name: triggerName, exact: true }).first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Opens a Radix Select trigger by id and picks the option by visible text. */
export async function pickSelect(page: Page, dialog: Locator, id: string, option: string): Promise<void> {
  await dialog.locator(`#${id}`).click();
  await page.locator('[role="listbox"]:visible').getByRole("option", { name: option }).click();
}

/**
 * Waits for the post-create inline banner (role="status"), asserts its text and
 * returns the detail-page href from the banner link.
 */
export async function expectStatusBanner(page: Page, pattern: RegExp): Promise<string> {
  const banner = page.getByRole("status").first();
  await expect(banner).toContainText(pattern, { timeout: 15_000 });
  const link = banner.locator("a").first();
  await expect(link).toBeVisible();
  return (await link.getAttribute("href")) ?? "";
}

export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function relativeInput(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
