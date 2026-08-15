import type {
  CreateStockMovementInput,
  StockMovement,
  StockMovementListQuery,
  StockMovementListResponse,
} from "@amni/shared";
import { AmniApiError, apiRequest, toQueryString } from "./client";

export class StockMovementsApiError extends AmniApiError {}

const DEMO_MOVEMENTS: StockMovement[] = [
  { code: "MOV-0001", type: "in", productCode: "PRD-0001", productName: "Nimbus LED Panel", uom: "pcs", quantity: 200, fromWarehouse: undefined, toWarehouse: "WH-0001", reason: "Initial stock received", reference: "PO-0021", createdBy: "Amara Osei", date: "2026-06-28T10:00:00.000Z" },
  { code: "MOV-0002", type: "in", productCode: "PRD-0002", productName: "Aluminium Sheet", uom: "m2", quantity: 150, fromWarehouse: undefined, toWarehouse: "WH-0001", reason: "Supplier delivery", reference: "PO-0019", createdBy: "Theo Lindqvist", date: "2026-07-02T14:30:00.000Z" },
  { code: "MOV-0003", type: "out", productCode: "PRD-0001", productName: "Nimbus LED Panel", uom: "pcs", quantity: 24, fromWarehouse: "WH-0001", toWarehouse: undefined, reason: "Customer order fulfilment", reference: "SO-2040", createdBy: "Amara Osei", date: "2026-07-05T09:15:00.000Z" },
  { code: "MOV-0004", type: "transfer", productCode: "PRD-0003", productName: "ErgoMesh Task Chair", uom: "pcs", quantity: 80, fromWarehouse: "WH-0001", toWarehouse: "WH-0002", reason: "Reallocation to regional warehouse", reference: "TRN-0081", createdBy: "Theo Lindqvist", date: "2026-07-09T11:45:00.000Z" },
  { code: "MOV-0005", type: "adjust", productCode: "PRD-0004", productName: "Aurora Floor Lamp", uom: "pcs", quantity: 5, fromWarehouse: "WH-0002", toWarehouse: undefined, reason: "Cycle count variance", reference: "INV-0003", createdBy: "Amara Osei", date: "2026-07-11T16:00:00.000Z" },
  { code: "MOV-0006", type: "in", productCode: "PRD-0005", productName: "Standing Desk Pro 160", uom: "pcs", quantity: 300, fromWarehouse: undefined, toWarehouse: "WH-0003", reason: "Received from vendor", reference: "PO-0025", createdBy: "Theo Lindqvist", date: "2026-07-14T08:20:00.000Z" },
  { code: "MOV-0007", type: "out", productCode: "PRD-0002", productName: "Aluminium Sheet", uom: "m2", quantity: 40, fromWarehouse: "WH-0001", toWarehouse: undefined, reason: "Customer order fulfilment", reference: "SO-2044", createdBy: "Amara Osei", date: "2026-07-17T13:10:00.000Z" },
  { code: "MOV-0008", type: "transfer", productCode: "PRD-0001", productName: "Nimbus LED Panel", uom: "pcs", quantity: 60, fromWarehouse: "WH-0001", toWarehouse: "WH-0003", reason: "Safety stock top-up", reference: "TRN-0084", createdBy: "Theo Lindqvist", date: "2026-07-20T15:00:00.000Z" },
  { code: "MOV-0009", type: "adjust", productCode: "PRD-0003", productName: "ErgoMesh Task Chair", uom: "pcs", quantity: 12, fromWarehouse: "WH-0002", toWarehouse: undefined, reason: "Cycle count variance", reference: "INV-0007", createdBy: "Amara Osei", date: "2026-07-22T10:30:00.000Z" },
  { code: "MOV-0010", type: "in", productCode: "PRD-0006", productName: "MDF Panel 18mm", uom: "m2", quantity: 500, fromWarehouse: undefined, toWarehouse: "WH-0001", reason: "Initial stock received", reference: "PO-0031", createdBy: "Theo Lindqvist", date: "2026-07-25T11:00:00.000Z" },
  { code: "MOV-0011", type: "out", productCode: "PRD-0005", productName: "Standing Desk Pro 160", uom: "pcs", quantity: 75, fromWarehouse: "WH-0003", toWarehouse: undefined, reason: "Customer order fulfilment", reference: "SO-2051", createdBy: "Amara Osei", date: "2026-07-28T14:40:00.000Z" },
  { code: "MOV-0012", type: "transfer", productCode: "PRD-0004", productName: "Aurora Floor Lamp", uom: "pcs", quantity: 100, fromWarehouse: "WH-0003", toWarehouse: "WH-0002", reason: "Reallocation to west DC", reference: "TRN-0090", createdBy: "Theo Lindqvist", date: "2026-07-31T09:50:00.000Z" },
  { code: "MOV-0013", type: "adjust", productCode: "PRD-0006", productName: "MDF Panel 18mm", uom: "m2", quantity: 8, fromWarehouse: undefined, toWarehouse: "WH-0001", reason: "Cycle count variance", reference: "INV-0011", createdBy: "Amara Osei", date: "2026-08-02T16:15:00.000Z" },
  { code: "MOV-0014", type: "in", productCode: "PRD-0002", productName: "Aluminium Sheet", uom: "m2", quantity: 120, fromWarehouse: undefined, toWarehouse: "WH-0002", reason: "Supplier delivery", reference: "PO-0034", createdBy: "Theo Lindqvist", date: "2026-08-04T12:00:00.000Z" },
  { code: "MOV-0015", type: "out", productCode: "PRD-0006", productName: "MDF Panel 18mm", uom: "m2", quantity: 180, fromWarehouse: "WH-0001", toWarehouse: undefined, reason: "Customer order fulfilment", reference: "SO-2058", createdBy: "Amara Osei", date: "2026-08-06T15:25:00.000Z" },
  { code: "MOV-0016", type: "adjust", productCode: "PRD-0001", productName: "Nimbus LED Panel", uom: "pcs", quantity: 4, fromWarehouse: "WH-0001", toWarehouse: undefined, reason: "Cycle count variance", reference: "INV-0014", createdBy: "Amara Osei", date: "2026-08-08T10:10:00.000Z" },
];

const localMovementsStore: StockMovement[] = [...DEMO_MOVEMENTS];

function filterDemoMovements(query: Partial<StockMovementListQuery>): StockMovementListResponse {
  const { page = 1, pageSize = 20, q, type, productCode } = query;
  const searchStr = (q ?? "").toLowerCase().trim();
  const filtered = localMovementsStore.filter((m) => {
    if (type && m.type !== type) return false;
    if (productCode && m.productCode !== productCode) return false;
    if (!searchStr) return true;
    return (
      m.code.toLowerCase().includes(searchStr) ||
      m.productCode.toLowerCase().includes(searchStr) ||
      m.productName.toLowerCase().includes(searchStr) ||
      (m.reason ?? "").toLowerCase().includes(searchStr) ||
      (m.reference ?? "").toLowerCase().includes(searchStr)
    );
  });
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { items, meta: { total: filtered.length, page, pageSize } };
}

export const stockMovementsClient = {
  async list(query: Partial<StockMovementListQuery> = {}): Promise<StockMovementListResponse> {
    try {
      return await apiRequest<StockMovementListResponse>(
        "/inventory/movements",
        toQueryString({
          page: query.page,
          pageSize: query.pageSize,
          q: query.q,
          sortBy: query.sortBy,
          sortDir: query.sortDir,
          type: query.type,
          productCode: query.productCode,
        }),
      );
    } catch {
      return filterDemoMovements(query);
    }
  },

  async create(input: CreateStockMovementInput): Promise<StockMovement> {
    try {
      return await apiRequest<StockMovement>("/inventory/movements", "/", { method: "POST", body: input });
    } catch {
      const code = `MOV-${String(localMovementsStore.length + 1).padStart(4, "0")}`;
      const newMovement: StockMovement = {
        code,
        type: input.type,
        productCode: input.productCode,
        productName: `Product ${input.productCode}`,
        uom: "pcs",
        quantity: input.quantity,
        fromWarehouse: input.fromWarehouse ?? undefined,
        toWarehouse: input.toWarehouse ?? undefined,
        reason: input.reason ?? undefined,
        reference: input.reference ?? undefined,
        createdBy: "Amara Osei",
        date: new Date().toISOString(),
      };
      localMovementsStore.unshift(newMovement);
      return newMovement;
    }
  },
};

export function formatMovementDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
