import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import { ProductRole, type GlobalSearchGroup, type GlobalSearchQuery, type GlobalSearchResponse, type GlobalSearchResult } from "@amni/shared";

// Value import required so tsc emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

interface SearchDefinition {
  doctype: string;
  type: GlobalSearchResult["type"];
  label: string;
  href: string;
  roles: ProductRole[];
}

const SEARCH_LIMIT = 5;
const DEFINITIONS: SearchDefinition[] = [
  { doctype: "Customer", type: "customer", label: "Customers", href: "/sales/customers", roles: [ProductRole.ADMIN, ProductRole.SALES] },
  { doctype: "Lead", type: "lead", label: "Leads", href: "/sales/leads", roles: [ProductRole.ADMIN, ProductRole.SALES] },
  { doctype: "Quotation", type: "quotation", label: "Quotations", href: "/sales/quotations", roles: [ProductRole.ADMIN, ProductRole.SALES] },
  { doctype: "Sales Order", type: "sales_order", label: "Sales orders", href: "/sales/orders", roles: [ProductRole.ADMIN, ProductRole.SALES] },
  { doctype: "Sales Invoice", type: "sales_invoice", label: "Sales invoices", href: "/sales/invoices", roles: [ProductRole.ADMIN, ProductRole.SALES, ProductRole.ACCOUNTANT] },
  { doctype: "Supplier", type: "supplier", label: "Suppliers", href: "/purchasing/suppliers", roles: [ProductRole.ADMIN, ProductRole.INVENTORY] },
  { doctype: "Purchase Order", type: "purchase_order", label: "Purchase orders", href: "/purchasing/orders", roles: [ProductRole.ADMIN, ProductRole.INVENTORY, ProductRole.ACCOUNTANT] },
  { doctype: "Purchase Invoice", type: "purchase_invoice", label: "Purchase invoices", href: "/purchasing/invoices", roles: [ProductRole.ADMIN, ProductRole.INVENTORY, ProductRole.ACCOUNTANT] },
  { doctype: "Item", type: "product", label: "Products", href: "/inventory/products", roles: [ProductRole.ADMIN, ProductRole.INVENTORY] },
  { doctype: "Warehouse", type: "warehouse", label: "Warehouses", href: "/inventory/warehouses", roles: [ProductRole.ADMIN, ProductRole.INVENTORY] },
  { doctype: "Payment Entry", type: "payment", label: "Payments", href: "/finance/payments", roles: [ProductRole.ADMIN, ProductRole.ACCOUNTANT] },
  { doctype: "Expense Claim", type: "expense", label: "Expenses", href: "/finance/expenses", roles: [ProductRole.ADMIN, ProductRole.ACCOUNTANT] },
];

type SearchLinkResponse = { results?: Array<{ value?: string; description?: string }> } | Array<{ value?: string; description?: string }>;

@Injectable()
export class SearchService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async global(user: GatewayUser, meta: GatewayRequestMeta, query: GlobalSearchQuery): Promise<GlobalSearchResponse> {
    const q = query.q.toLowerCase().trim();
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const role = Object.values(ProductRole).includes(user.role as ProductRole) ? user.role as ProductRole : ProductRole.MEMBER;
    const definitions = DEFINITIONS.filter((definition) => definition.roles.includes(role));
    const groups = (await Promise.all(definitions.map(async (definition): Promise<GlobalSearchGroup | null> => {
      let response: SearchLinkResponse;
      try {
        response = await client.call<SearchLinkResponse>("frappe.desk.search.search_link", {
          doctype: definition.doctype,
          txt: q,
          page_length: SEARCH_LIMIT,
        });
      } catch {
        return null;
      }
      const rows = Array.isArray(response) ? response : response.results ?? [];
      const results = rows.slice(0, SEARCH_LIMIT).flatMap((row): GlobalSearchResult[] => {
        const value = row.value?.trim();
        if (!value) return [];
        return [{
          id: `${definition.type}-${value}`.slice(0, 64),
          title: value,
          subtitle: row.description ? `${definition.doctype} · ${row.description}`.slice(0, 200) : definition.doctype,
          type: definition.type,
          href: `${definition.href}/${encodeURIComponent(value)}`,
          meta: value.slice(0, 80),
        }];
      });
      return results.length ? { label: definition.label, results } : null;
    }))).filter((group): group is GlobalSearchGroup => group !== null);

    if (role === ProductRole.ADMIN) {
      const memberships = await prisma.membership.findMany({
        where: { companyId, status: "ACTIVE", user: { OR: [{ email: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] } },
        select: { id: true, productRole: true, user: { select: { email: true, firstName: true, lastName: true } } },
        take: SEARCH_LIMIT,
      });
      if (memberships.length) {
        groups.push({ label: "Team", results: memberships.map((membership) => ({
          id: `member-${membership.id}`.slice(0, 64),
          title: [membership.user.firstName, membership.user.lastName].filter(Boolean).join(" "),
          subtitle: membership.user.email,
          type: "member",
          href: "/settings/team",
          meta: membership.productRole,
        })) });
      }
    }
    return { query: q, groups };
  }
}
