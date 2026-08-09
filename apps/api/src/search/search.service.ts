import { Injectable } from "@nestjs/common";
import type {
  GlobalSearchGroup,
  GlobalSearchQuery,
  GlobalSearchResponse,
  GlobalSearchResult,
} from "@amni/shared";

const INDEX: GlobalSearchResult[] = [
  { id: "customer-cus-0001", title: "Serenity Interiors", subtitle: "Customer · Interior Fit-out", type: "customer", href: "/sales/customers/CUS-0001", meta: "CUS-0001" },
  { id: "customer-cus-0002", title: "Lumina Supplies", subtitle: "Customer · Lighting Distributor", type: "customer", href: "/sales/customers/CUS-0002", meta: "CUS-0002" },
  { id: "customer-cus-0003", title: "Atlas Facilities", subtitle: "Customer · Facilities Management", type: "customer", href: "/sales/customers/CUS-0003", meta: "CUS-0003" },
  { id: "supplier-sup-0001", title: "Nordic Timberworks", subtitle: "Supplier · Raw Materials", type: "supplier", href: "/purchasing/suppliers/SUP-0001", meta: "SUP-0001" },
  { id: "supplier-sup-0002", title: "Fleetline Metals", subtitle: "Supplier · Raw Materials", type: "supplier", href: "/purchasing/suppliers/SUP-0002", meta: "SUP-0002" },
  { id: "supplier-sup-0004", title: "Hale Lighting Co.", subtitle: "Supplier · Lighting", type: "supplier", href: "/purchasing/suppliers/SUP-0004", meta: "SUP-0004" },
  { id: "product-prd-0001", title: "Nimbus LED Panel", subtitle: "Product · lighting", type: "product", href: "/inventory/products/PRD-0001", meta: "PRD-0001" },
  { id: "product-prd-0002", title: "Aluminium Sheet", subtitle: "Product · materials", type: "product", href: "/inventory/products/PRD-0002", meta: "PRD-0002" },
  { id: "product-prd-0003", title: "ErgoMesh Task Chair", subtitle: "Product · furniture", type: "product", href: "/inventory/products/PRD-0003", meta: "PRD-0003" },
  { id: "product-prd-0012", title: "A4 Copy Paper 80gsm", subtitle: "Product · office", type: "product", href: "/inventory/products/PRD-0012", meta: "PRD-0012" },
  { id: "lead-lead-0001", title: "Halcyon Retail Group", subtitle: "Lead · qualification", type: "lead", href: "/sales/leads/LEAD-0001", meta: "LEAD-0001" },
  { id: "order-so-2040", title: "Sales order SO-2040", subtitle: "Serenity Interiors", type: "sales_order", href: "/sales/orders/SO-2040", meta: "$5,380.00" },
  { id: "invoice-inv-0003", title: "Invoice INV-0003", subtitle: "Serenity Interiors", type: "sales_invoice", href: "/sales/invoices/INV-0003", meta: "$9,260.00" },
  { id: "invoice-inv-0002", title: "Invoice INV-0002", subtitle: "Northwind Traders", type: "sales_invoice", href: "/sales/invoices/INV-0002", meta: "$2,890.00" },
  { id: "purchase-order-po-0002", title: "Purchase order PO-0002", subtitle: "Hale Lighting Co.", type: "purchase_order", href: "/purchasing/orders/PO-0002", meta: "$3,200.00" },
  { id: "purchase-invoice-pinv-0002", title: "Purchase invoice PINV-0002", subtitle: "Fleetline Metals", type: "purchase_invoice", href: "/purchasing/invoices/PINV-0002", meta: "$3,032.00" },
  { id: "quotation-qt-0018", title: "Quotation QT-0018", subtitle: "Atlas Facilities", type: "quotation", href: "/sales/quotations/QT-0018", meta: "accepted" },
  { id: "expense-exp-0003", title: "Design suite annual licence", subtitle: "Expense · software", type: "expense", href: "/finance/expenses/EXP-0003", meta: "$1,290.00" },
  { id: "payment-pay-0001", title: "Payment PAY-0001", subtitle: "Serenity Interiors", type: "payment", href: "/finance/payments/PAY-0001", meta: "$5,000.00" },
  { id: "warehouse-wh-0001", title: "Bristol Central", subtitle: "Warehouse · primary", type: "warehouse", href: "/inventory/warehouses/WH-0001", meta: "WH-0001" },
  { id: "member-usr-1", title: "Amara Osei", subtitle: "Owner · demo@amni.dev", type: "member", href: "/settings/team", meta: "OWNER" },
];

/**
 * Reference data for the Demo Co tenant. Search reads from the platform
 * search index once M3 wires real persistence; the contract stays the same.
 */
@Injectable()
export class SearchService {
  global(query: GlobalSearchQuery): GlobalSearchResponse {
    const q = query.q.toLowerCase().trim();
    const matches = INDEX.filter((result) =>
      [result.title, result.subtitle, result.meta ?? "", result.href]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );

    const groups: GlobalSearchGroup[] = [];
    const order = ["customer", "supplier", "product", "lead", "quotation", "sales_order", "sales_invoice", "purchase_order", "purchase_invoice", "expense", "payment", "warehouse", "member"] as const;
    const labels: Record<(typeof order)[number], string> = {
      customer: "Customers",
      supplier: "Suppliers",
      product: "Products",
      lead: "Leads",
      quotation: "Quotations",
      sales_order: "Sales orders",
      sales_invoice: "Sales invoices",
      purchase_order: "Purchase orders",
      purchase_invoice: "Purchase invoices",
      expense: "Expenses",
      payment: "Payments",
      warehouse: "Warehouses",
      member: "Team",
    };
    for (const type of order) {
      const results = matches.filter((result) => result.type === type);
      if (results.length > 0) {
        groups.push({ label: labels[type], results });
      }
    }

    return { query: q, groups };
  }
}
