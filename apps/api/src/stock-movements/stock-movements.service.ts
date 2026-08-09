import { Injectable } from "@nestjs/common";
import {
  type CreateStockMovementInput,
  type StockMovement,
  type StockMovementListQuery,
  type StockMovementListResponse,
} from "@amni/shared";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set(["code", "type", "productCode", "quantity", "date", "createdBy"]);

const PRODUCT_NAMES: Record<string, string> = {
  "PRD-0001": "Ergonomic Office Chair",
  "PRD-0002": "Standing Desk",
  "PRD-0003": "LED Desk Lamp",
  "PRD-0004": "Wireless Keyboard",
  "PRD-0005": "Steel Shelving Unit",
  "PRD-0006": "Corrugated Box 12x12",
};

const SEED: StockMovement[] = [
  { code: "MOV-0001", type: "in", productCode: "PRD-0001", productName: "Ergonomic Office Chair", uom: "pcs", quantity: 200, fromWarehouse: null, toWarehouse: "WH-0001", reason: "Initial stock received", reference: "PO-0021", createdBy: "Amara Osei", date: iso(42) },
  { code: "MOV-0002", type: "in", productCode: "PRD-0002", productName: "Standing Desk", uom: "pcs", quantity: 150, fromWarehouse: null, toWarehouse: "WH-0001", reason: "Supplier delivery", reference: "PO-0019", createdBy: "Theo Lindqvist", date: iso(38) },
  { code: "MOV-0003", type: "out", productCode: "PRD-0001", productName: "Ergonomic Office Chair", uom: "pcs", quantity: 24, fromWarehouse: "WH-0001", toWarehouse: null, reason: "Customer order fulfilment", reference: "SO-2040", createdBy: "Amara Osei", date: iso(35) },
  { code: "MOV-0004", type: "transfer", productCode: "PRD-0003", productName: "LED Desk Lamp", uom: "pcs", quantity: 80, fromWarehouse: "WH-0001", toWarehouse: "WH-0002", reason: "Reallocation to east DC", reference: "TRN-0081", createdBy: "Theo Lindqvist", date: iso(31) },
  { code: "MOV-0005", type: "adjust", productCode: "PRD-0004", productName: "Wireless Keyboard", uom: "pcs", quantity: 5, fromWarehouse: "WH-0002", toWarehouse: null, reason: "Cycle count variance", reference: "INV-0003", createdBy: "Amara Osei", date: iso(29) },
  { code: "MOV-0006", type: "in", productCode: "PRD-0005", productName: "Steel Shelving Unit", uom: "pcs", quantity: 300, fromWarehouse: null, toWarehouse: "WH-0003", reason: "Received from vendor", reference: "PO-0025", createdBy: "Theo Lindqvist", date: iso(26) },
  { code: "MOV-0007", type: "out", productCode: "PRD-0002", productName: "Standing Desk", uom: "pcs", quantity: 40, fromWarehouse: "WH-0001", toWarehouse: null, reason: "Customer order fulfilment", reference: "SO-2044", createdBy: "Amara Osei", date: iso(23) },
  { code: "MOV-0008", type: "transfer", productCode: "PRD-0001", productName: "Ergonomic Office Chair", uom: "pcs", quantity: 60, fromWarehouse: "WH-0001", toWarehouse: "WH-0003", reason: "Safety stock top-up", reference: "TRN-0084", createdBy: "Theo Lindqvist", date: iso(20) },
  { code: "MOV-0009", type: "adjust", productCode: "PRD-0003", productName: "LED Desk Lamp", uom: "pcs", quantity: 12, fromWarehouse: "WH-0002", toWarehouse: null, reason: "Cycle count variance", reference: "INV-0007", createdBy: "Amara Osei", date: iso(18) },
  { code: "MOV-0010", type: "in", productCode: "PRD-0006", productName: "Corrugated Box 12x12", uom: "pcs", quantity: 500, fromWarehouse: null, toWarehouse: "WH-0001", reason: "Initial stock received", reference: "PO-0031", createdBy: "Theo Lindqvist", date: iso(15) },
  { code: "MOV-0011", type: "out", productCode: "PRD-0005", productName: "Steel Shelving Unit", uom: "pcs", quantity: 75, fromWarehouse: "WH-0003", toWarehouse: null, reason: "Customer order fulfilment", reference: "SO-2051", createdBy: "Amara Osei", date: iso(12) },
  { code: "MOV-0012", type: "transfer", productCode: "PRD-0004", productName: "Wireless Keyboard", uom: "pcs", quantity: 100, fromWarehouse: "WH-0003", toWarehouse: "WH-0002", reason: "Reallocation to west DC", reference: "TRN-0090", createdBy: "Theo Lindqvist", date: iso(9) },
  { code: "MOV-0013", type: "adjust", productCode: "PRD-0006", productName: "Corrugated Box 12x12", uom: "pcs", quantity: 8, fromWarehouse: null, toWarehouse: "WH-0001", reason: "Cycle count variance", reference: "INV-0011", createdBy: "Amara Osei", date: iso(7) },
  { code: "MOV-0014", type: "in", productCode: "PRD-0002", productName: "Standing Desk", uom: "pcs", quantity: 120, fromWarehouse: null, toWarehouse: "WH-0002", reason: "Supplier delivery", reference: "PO-0034", createdBy: "Theo Lindqvist", date: iso(5) },
  { code: "MOV-0015", type: "out", productCode: "PRD-0006", productName: "Corrugated Box 12x12", uom: "pcs", quantity: 180, fromWarehouse: "WH-0001", toWarehouse: null, reason: "Customer order fulfilment", reference: "SO-2058", createdBy: "Amara Osei", date: iso(3) },
  { code: "MOV-0016", type: "adjust", productCode: "PRD-0001", productName: "Ergonomic Office Chair", uom: "pcs", quantity: 4, fromWarehouse: "WH-0001", toWarehouse: null, reason: "Cycle count variance", reference: "INV-0014", createdBy: "Amara Osei", date: iso(1) },
];

function nextCode(records: StockMovement[]): string {
  const max = records.reduce((highest, movement) => {
    const number = Number(movement.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `MOV-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Reference data for the Demo Co tenant. This module is the only stock
 * movements surface until the ERP gateway lands (M5); endpoints then read
 * from the tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class StockMovementsService {
  private records: StockMovement[] = [...SEED];

  list(query: StockMovementListQuery): StockMovementListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((movement) => {
      if (query.type && movement.type !== query.type) return false;
      if (query.productCode && movement.productCode !== query.productCode) return false;
      if (!q) return true;
      return [
        movement.code,
        movement.productCode,
        movement.productName,
        movement.fromWarehouse ?? "",
        movement.toWarehouse ?? "",
        movement.reason ?? "",
        movement.reference ?? "",
        movement.createdBy ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "date";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy as keyof StockMovement];
      const bValue = b[sortBy as keyof StockMovement];
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      meta: { total: sorted.length, page, pageSize },
    };
  }

  create(input: CreateStockMovementInput): StockMovement {
    const movement: StockMovement = {
      code: nextCode(this.records),
      type: input.type,
      productCode: input.productCode,
      productName: PRODUCT_NAMES[input.productCode] ?? `Product ${input.productCode}`,
      uom: "pcs",
      quantity: input.quantity,
      fromWarehouse: input.fromWarehouse ?? null,
      toWarehouse: input.toWarehouse ?? null,
      reason: input.reason,
      reference: input.reference,
      createdBy: "Amara Osei",
      date: new Date().toISOString(),
    };
    this.records.push(movement);
    return movement;
  }
}
