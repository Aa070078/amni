"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, ClipboardList, StickyNote } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import type { PurchaseOrderStatus } from "@amni/shared";
import { getPurchaseOrder } from "@/src/lib/purchasing";
import { purchaseOrderStatusBadge, purchaseOrderStatusLabel } from "@/src/lib/purchasing";
import { formatCurrency, formatDate, formatNumber } from "@/src/lib/format";
import { PanelError } from "@/src/components/dashboard/panel-utils";

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge variant={purchaseOrderStatusBadge[status]}>{purchaseOrderStatusLabel(status)}</Badge>;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-40 rounded-lg lg:col-span-2" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg lg:col-span-3" />
      </div>
    </div>
  );
}

export function PurchaseOrderDetailView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["purchasing", "purchase-order", id],
    queryFn: () => getPurchaseOrder(id),
  });

  if (query.isLoading) {
    return <DetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return <PanelError onRetry={() => void query.refetch()} />;
  }

  const order = query.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchasing/purchase-orders">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Purchase orders
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              {order.number}
            </CardTitle>
            <StatusBadge status={order.status} />
            <Badge variant="secondary">{order.currency}</Badge>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href={`/purchasing/suppliers/${order.supplierId}`} className="hover:underline">
                {order.supplierName}
              </Link>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Ordered {formatDate(order.date)}
            </span>
            {order.expectedDate ? (
              <span className="flex items-center gap-1.5">
                Expected {formatDate(order.expectedDate)}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
            <CardDescription>Line items on this purchase order.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={`${item.item}-${index}`}>
                    <TableCell className="font-medium">{item.item}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.rate, order.currency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount, order.currency)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.total, order.currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Order details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {order.submittedAt ? (
              <div>
                <p className="font-medium text-muted-foreground">Submitted</p>
                <p className="mt-1">{formatDate(order.submittedAt)}</p>
              </div>
            ) : null}
            {order.receivedAt ? (
              <div>
                <p className="font-medium text-muted-foreground">Received</p>
                <p className="mt-1">{formatDate(order.receivedAt)}</p>
              </div>
            ) : null}
            {order.notes ? (
              <div>
                <p className="font-medium text-muted-foreground">Notes</p>
                <p className="mt-1">{order.notes}</p>
              </div>
            ) : null}
            <div>
              <p className="font-medium text-muted-foreground">Created</p>
              <p className="mt-1">{formatDate(order.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
