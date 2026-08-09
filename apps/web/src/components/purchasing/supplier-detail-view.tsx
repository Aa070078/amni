"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, ClipboardList, Clock3, Globe, Mail, MapPin, Phone, ShoppingCart, StickyNote, type LucideIcon } from "lucide-react";
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
import type { SupplierAddress, SupplierStatus } from "@amni/shared";
import { getSupplier } from "@/src/lib/purchasing";
import { supplierStatusBadge, supplierStatusLabel } from "@/src/lib/purchasing";
import { formatCurrency, formatDate, formatNumber } from "@/src/lib/format";
import { PanelError } from "@/src/components/dashboard/panel-utils";

function StatusBadge({ status }: { status: SupplierStatus }) {
  return <Badge variant={supplierStatusBadge[status]}>{supplierStatusLabel(status)}</Badge>;
}

function OrderStatusBadge({ status }: { status: "draft" | "submitted" | "received" | "cancelled" }) {
  const variant =
    status === "received" ? "success" : status === "submitted" ? "outline" : status === "cancelled" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status[0]!.toUpperCase() + status.slice(1)}</Badge>;
}

function formatAddress(address: SupplierAddress): string {
  const parts = [address.line1, address.line2, address.city, address.state, address.country, address.postalCode]
    .filter((part): part is string => part !== undefined);
  return parts.join(", ") || "No address on file";
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

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-md border p-4">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function SupplierDetailView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["purchasing", "supplier", id],
    queryFn: () => getSupplier(id),
  });

  if (query.isLoading) {
    return <DetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return <PanelError onRetry={() => void query.refetch()} />;
  }

  const supplier = query.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchasing/suppliers">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Suppliers
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              {supplier.name}
            </CardTitle>
            <StatusBadge status={supplier.status} />
            {supplier.supplierGroup ? <Badge variant="secondary">{supplier.supplierGroup}</Badge> : null}
          </div>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {supplier.email ? (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {supplier.email}
              </span>
            ) : null}
            {supplier.phone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {supplier.phone}
              </span>
            ) : null}
            {supplier.territory ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {supplier.territory}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total purchased"
            value={formatCurrency(supplier.stats.totalPurchased, supplier.currency)}
            icon={ShoppingCart}
          />
          <StatCard
            label="Total paid"
            value={formatCurrency(supplier.stats.totalPaid, supplier.currency)}
            icon={CheckCircle2}
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(supplier.stats.outstanding, supplier.currency)}
            icon={Clock3}
          />
          <StatCard label="Purchase orders" value={formatNumber(supplier.stats.orderCount)} icon={ClipboardList} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent purchase orders</CardTitle>
            <CardDescription>Latest orders placed with this supplier.</CardDescription>
          </CardHeader>
          <CardContent>
            {supplier.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchasing/purchase-orders/${order.id}`}
                          className="hover:underline"
                        >
                          {order.number}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.total, supplier.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Billing address</p>
              <p className="mt-1">{supplier.billingAddress ? formatAddress(supplier.billingAddress) : "No address on file"}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Credit limit</p>
              <p className="mt-1">{supplier.creditLimit ? formatCurrency(supplier.creditLimit, supplier.currency) : "—"}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Balance</p>
              <p className="mt-1">{formatCurrency(supplier.balance, supplier.currency)}</p>
            </div>
            {supplier.legalName ? (
              <div>
                <p className="font-medium text-muted-foreground">Legal name</p>
                <p className="mt-1">{supplier.legalName}</p>
              </div>
            ) : null}
            {supplier.taxId ? (
              <div>
                <p className="font-medium text-muted-foreground">Tax ID</p>
                <p className="mt-1">{supplier.taxId}</p>
              </div>
            ) : null}
            {supplier.website ? (
              <div>
                <p className="font-medium text-muted-foreground">Website</p>
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  {supplier.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            ) : null}
            {supplier.notes ? (
              <div>
                <p className="font-medium text-muted-foreground">Notes</p>
                <p className="mt-1">{supplier.notes}</p>
              </div>
            ) : null}
            <div>
              <p className="font-medium text-muted-foreground">Supplier since</p>
              <p className="mt-1">{formatDate(supplier.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
