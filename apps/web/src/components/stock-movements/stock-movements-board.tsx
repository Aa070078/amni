"use client";

import { ArrowRight, Calendar, User } from "lucide-react";
import { MOVEMENT_TYPES, type MovementType, type StockMovement } from "@amni/shared";
import { Card, CardContent } from "@amni/ui";
import { formatNumber } from "@/src/lib/format";
import { formatMovementDate } from "@/src/lib/stock-movements";
import { MovementTypeBadge } from "./movement-type";

interface StockMovementsBoardProps {
  movements: StockMovement[];
}

export function StockMovementsBoard({ movements }: StockMovementsBoardProps) {
  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 pt-1"
      role="region"
      aria-label="Stock movements workflow board"
    >
      {MOVEMENT_TYPES.map(({ value, label }) => {
        const typeMovements = movements.filter((m) => m.type === value);
        const totalQuantity = typeMovements.reduce((sum, m) => sum + m.quantity, 0);

        return (
          <section
            key={value}
            aria-label={`${label} movements column`}
            className="flex min-h-[380px] w-[295px] shrink-0 flex-col rounded-xl border bg-muted/20 p-3 transition-colors"
          >
            <header className="flex items-center justify-between gap-2 px-1 py-2">
              <div className="flex items-center gap-2">
                <MovementTypeBadge type={value as MovementType} />
                <span
                  className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs tabular-nums text-muted-foreground font-medium"
                  aria-label={`${typeMovements.length} transactions`}
                >
                  {typeMovements.length}
                </span>
              </div>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {formatNumber(totalQuantity)} units
              </span>
            </header>

            <div className="flex flex-col gap-2.5 pt-2">
              {typeMovements.map((movement) => (
                <Card
                  key={movement.code}
                  className="transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <CardContent className="flex flex-col gap-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {movement.code}
                      </span>
                      {movement.reference ? (
                        <span className="font-mono text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {movement.reference}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-xs text-foreground line-clamp-1">
                        {movement.productName}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {movement.productCode}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs tabular-nums py-1 border-y border-border/40">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-semibold text-foreground">
                        {formatNumber(movement.quantity)} {movement.uom}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono">{movement.fromWarehouse ?? "—"}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <span className="font-mono">{movement.toWarehouse ?? "—"}</span>
                    </div>

                    {movement.reason ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                        &quot;{movement.reason}&quot;
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground/60" />
                        {formatMovementDate(movement.date)}
                      </span>
                      {movement.createdBy ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground/60" />
                          {movement.createdBy}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {typeMovements.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  <span>No {label.toLowerCase()} movements</span>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
