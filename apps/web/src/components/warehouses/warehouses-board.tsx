"use client";

import { useState, type DragEvent } from "react";
import Link from "next/link";
import { AlertTriangle, MapPin, Package, User, Warehouse as WarehouseIcon } from "lucide-react";
import type { StockLevel, WarehouseDetail } from "@amni/shared";
import { Badge, Card, CardContent, cn } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { WAREHOUSE_PRODUCT_PRICES, warehouseStockValue } from "@/src/lib/warehouses";
import { WarehouseStatusBadge } from "./warehouse-status";

interface WarehousesBoardProps {
  warehouses: WarehouseDetail[];
  onTransferStock?: (fromWarehouse: string, toWarehouse: string, productCode: string) => void;
}

const PRODUCT_TITLES: Record<string, string> = {
  "PRD-0001": "Nimbus LED Panel",
  "PRD-0002": "Aluminium Sheet",
  "PRD-0003": "ErgoMesh Task Chair",
  "PRD-0004": "Aurora Floor Lamp",
  "PRD-0005": "Standing Desk Pro 160",
  "PRD-0006": "MDF Panel 18mm",
  "PRD-0007": "Arc Swivel Chair",
  "PRD-0008": "Halide Track Light",
  "PRD-0009": "Kraftholmen Steel Shelving",
  "PRD-0010": "NeonCove LED Strip 5m",
  "PRD-0011": "Posturite Monitor Arm",
  "PRD-0012": "A4 Copy Paper 80gsm",
};

export function WarehousesBoard({ warehouses, onTransferStock }: WarehousesBoardProps) {
  const [dragItem, setDragItem] = useState<{ fromWarehouse: string; productCode: string } | null>(null);
  const [overWarehouse, setOverWarehouse] = useState<string | null>(null);

  function handleDrop(targetWarehouseCode: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setOverWarehouse(null);
    if (dragItem && dragItem.fromWarehouse !== targetWarehouseCode && onTransferStock) {
      onTransferStock(dragItem.fromWarehouse, targetWarehouseCode, dragItem.productCode);
    }
    setDragItem(null);
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 pt-1"
      role="region"
      aria-label="Warehouses stock allocation board"
    >
      {warehouses.map((wh) => {
        const whStockValue = warehouseStockValue(wh.stock);
        const lowStockCount = wh.lowStock.length;

        return (
          <section
            key={wh.code}
            aria-label={`${wh.name} warehouse column`}
            onDragOver={(event) => {
              event.preventDefault();
              setOverWarehouse(wh.code);
            }}
            onDragLeave={() => setOverWarehouse((current) => (current === wh.code ? null : current))}
            onDrop={(event) => handleDrop(wh.code, event)}
            className={cn(
              "flex min-h-[420px] w-[310px] shrink-0 flex-col rounded-xl border bg-muted/20 p-3 transition-colors",
              overWarehouse === wh.code && "border-primary bg-muted/50 ring-1 ring-primary/20",
            )}
          >
            <header className="flex flex-col gap-1.5 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/inventory/warehouses/${wh.code}`}
                  className="font-semibold text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1.5"
                >
                  <WarehouseIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="line-clamp-1">{wh.name}</span>
                </Link>
                <WarehouseStatusBadge status={wh.status} />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground/70" />
                  <span className="line-clamp-1">{wh.location?.split(",")[0] ?? "—"}</span>
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatCurrency(whStockValue, "USD")}
                </span>
              </div>

              {wh.manager ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3 text-muted-foreground/60" />
                  <span>{wh.manager}</span>
                </div>
              ) : null}
            </header>

            <div className="flex flex-col gap-2.5 pt-3">
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>Stock On-Hand ({wh.stock.length} lines)</span>
                {lowStockCount > 0 ? (
                  <span className="flex items-center gap-1 text-warning font-medium text-[11px]">
                    <AlertTriangle className="h-3 w-3" />
                    {lowStockCount} low
                  </span>
                ) : null}
              </div>

              {wh.stock.map((item: StockLevel) => {
                const productName = PRODUCT_TITLES[item.productCode] ?? `Product ${item.productCode}`;
                const unitPrice = WAREHOUSE_PRODUCT_PRICES[item.productCode] ?? 0;
                const isLow = item.onHand < item.reorderLevel;

                return (
                  <Card
                    key={item.productCode}
                    draggable
                    onDragStart={(event) => {
                      setDragItem({ fromWarehouse: wh.code, productCode: item.productCode });
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.productCode);
                    }}
                    onDragEnd={() => {
                      setDragItem(null);
                      setOverWarehouse(null);
                    }}
                    className={cn(
                      "cursor-grab transition-all hover:border-primary/50 hover:shadow-sm active:cursor-grabbing",
                      dragItem?.productCode === item.productCode && dragItem?.fromWarehouse === wh.code && "opacity-50",
                      isLow && "border-warning/40 bg-warning/5",
                    )}
                  >
                    <CardContent className="flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-1.5">
                        <Link
                          href={`/inventory/products/${item.productCode}`}
                          className="font-medium text-xs text-foreground hover:text-primary hover:underline line-clamp-1"
                        >
                          {productName}
                        </Link>
                        {isLow ? (
                          <Badge variant="outline" className="text-[10px] border-warning/40 text-warning px-1.5 py-0 shrink-0">
                            Low
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="text-muted-foreground font-mono">{item.productCode}</span>
                        <span className="font-semibold text-foreground">
                          {item.onHand} units
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                        <span>Reserved: {item.reserved}</span>
                        <span>Val: {formatCurrency(item.onHand * unitPrice, "USD")}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {wh.stock.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  <Package className="mb-1 h-5 w-5 text-muted-foreground/50" />
                  <span>No stock assigned to this location</span>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
