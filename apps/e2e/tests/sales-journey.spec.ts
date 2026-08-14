import { expect, test } from "@playwright/test";

import { readE2EState } from "../support/state.js";
import { expectStatusBanner, login, openDialog, pickSelect, relativeInput, todayInput } from "../support/ui.js";

const CUSTOMER_NAME = "E2E Buyer";
const PRODUCT_SKU = "E2E-100";
const PRODUCT_NAME = "E2E Ergonomic Chair";
const QTY = "3";
const RATE = "120";
const AMOUNT = "$360.00";

test.describe("Sales journey", () => {
  test("creates customer → product → order → invoice → payment and the dashboard reflects the business", async ({
    page,
  }) => {
    const state = readE2EState();
    test.skip(state.skipAll, state.skipReason ?? "E2E infrastructure unavailable");

    await login(page, state.ownerEmail, state.ownerPassword);

    // Fresh seeded tenant: the ERP-backed dashboard starts empty.
    await expect(page.getByText("Revenue", { exact: true })).toBeVisible();
    await expect(page.getByText("Accounts receivable", { exact: true })).toBeVisible();
    await expect(page.getByText("Cash balance", { exact: true })).toBeVisible();
    await expect(page.getByText("Inventory value", { exact: true })).toBeVisible();
    await expect(page.getByText("All clear", { exact: true })).toBeVisible();
    await expect(page.getByText("No activity yet", { exact: true })).toBeVisible();

    // 1. Customer
    const customerDialog = await openDialog(page, "/sales/customers", "New customer");
    await customerDialog.getByLabel("Name").fill(CUSTOMER_NAME);
    await customerDialog.getByLabel("Group").fill("Retail");
    await customerDialog.getByLabel("Territory").fill("United States");
    await customerDialog.getByLabel("Email").fill("e2e.buyer@amni.dev");
    await customerDialog.getByRole("button", { name: "Create customer", exact: true }).click();
    const customerHref = await expectStatusBanner(page, /Created/);
    expect(customerHref).toContain("/sales/customers/");

    // 2. Product
    const productDialog = await openDialog(page, "/inventory/products", "New product");
    await productDialog.getByLabel("SKU").fill(PRODUCT_SKU);
    await productDialog.getByLabel("Name").fill(PRODUCT_NAME);
    await pickSelect(page, productDialog, "product-category", "Office");
    await pickSelect(page, productDialog, "product-unit", "pcs");
    await productDialog.getByLabel("Price").fill(RATE);
    await productDialog.getByLabel("Cost").fill("60");
    await productDialog.getByLabel("Reorder level").fill("10");
    await productDialog.getByLabel("VAT rate (%)").fill("0");
    await pickSelect(page, productDialog, "product-status", "Active");
    await productDialog.getByRole("button", { name: "Create product", exact: true }).click();
    const productHref = await expectStatusBanner(page, /Created/);
    expect(productHref).toContain("/inventory/products/");

    // 3. Sales order (3 × 120 = 360)
    const orderDialog = await openDialog(page, "/sales/orders", "New order");
    await pickSelect(page, orderDialog, "order-customer", CUSTOMER_NAME);
    await orderDialog.locator("#order-date").fill(todayInput());
    await orderDialog.locator("#order-delivery").fill(relativeInput(30));
    await pickSelect(page, orderDialog, "order-item-0-product", PRODUCT_NAME);
    await orderDialog.locator("#order-item-0-qty").fill(QTY);
    await orderDialog.locator("#order-item-0-rate").fill(RATE);
    await orderDialog.getByRole("button", { name: "Create order", exact: true }).click();
    const orderHref = await expectStatusBanner(page, /Created/);
    expect(orderHref).toContain("/sales/orders/");

    // 4. Sales invoice, due yesterday so it lands in the overdue alert.
    const invoiceDialog = await openDialog(page, "/sales/invoices", "New invoice");
    await pickSelect(page, invoiceDialog, "invoice-customer", CUSTOMER_NAME);
    await invoiceDialog.locator("#invoice-date").fill(todayInput());
    await invoiceDialog.locator("#invoice-due").fill(relativeInput(-1));
    await pickSelect(page, invoiceDialog, "invoice-item-0-product", PRODUCT_NAME);
    await invoiceDialog.locator("#invoice-item-0-qty").fill(QTY);
    await invoiceDialog.locator("#invoice-item-0-rate").fill(RATE);
    await invoiceDialog.getByRole("button", { name: "Create invoice", exact: true }).click();
    const invoiceHref = await expectStatusBanner(page, /Created/);
    expect(invoiceHref).toContain("/sales/invoices/");

    // 5. Submit the draft invoice on its detail page.
    await page.goto(invoiceHref);
    const submitButton = page.getByRole("button", { name: "Submit", exact: true });
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    await expect(submitButton).not.toBeVisible();

    // 6. Record the payment against the submitted invoice (amount prefilled).
    await page.getByRole("button", { name: "Record payment", exact: true }).click();
    const paymentDialog = page.getByRole("dialog");
    await expect(paymentDialog).toBeVisible();
    await paymentDialog.locator("#payment-amount").fill("360");
    await paymentDialog.locator("#payment-reference").fill("TXN-E2E-001");
    await paymentDialog.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(paymentDialog).not.toBeVisible();

    // 7. The dashboard KPIs, alerts and activity now reflect the business.
    await page.goto("/dashboard");
    await expect(page.getByText("Revenue", { exact: true })).toBeVisible();
    await expect(page.getByText("Invoiced this month", { exact: true })).toBeVisible();
    await expect(page.getByText("1 invoice outstanding", { exact: true })).toBeVisible();
    await expect(page.getByText("1 payment entries", { exact: true })).toBeVisible();
    await expect(page.getByText("1 invoice are overdue", { exact: true })).toBeVisible();
    await expect(page.getByText("Submitted invoice", { exact: true })).toBeVisible();
    await expect(page.getByText("Created sales order", { exact: true })).toBeVisible();
    await expect(page.getByText("Added customer", { exact: true })).toBeVisible();
    // Revenue, AR and Cash all settle on 360.00 (count-up animation included).
    await expect(page.getByText(AMOUNT, { exact: true })).toHaveCount(3);
  });
});
