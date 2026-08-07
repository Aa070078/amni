"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, MapPin, Phone, StickyNote, UserRound } from "lucide-react";
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
import type { SalesCustomer, SalesCustomerOrderStatus } from "@amni/shared";
import { getCustomer } from "@/src/lib/sales";
import { formatCurrency, formatDate, formatNumber } from "@/src/lib/format";
import { PanelError } from "@/src/components/dashboard/panel-utils";

function StatusBadge({ status }: { status: SalesCustomer["status"] }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
  );
}

function TypeBadge({ type }: { type: SalesCustomer["type"] }) {
  return (
    <Badge variant={type === "company" ? "outline" : "secondary"}>
      {type === "company" ? "Company" : "Individual"}
    </Badge>
  );
}

function OrderStatusBadge({ status }: { status: SalesCustomerOrderStatus }) {
  const variant =
    status === "paid" ? "default" : status === "invoiced" ? "outline" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
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

export function CustomerDetailView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["sales", "customer", id],
    queryFn: () => getCustomer(id),
  });

  if (query.isLoading) {
    return <DetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return <PanelError onRetry={() => void query.refetch()} />;
  }

  const customer = query.data;
  const Icon = customer.type === "company" ? Building2 : UserRound;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sales/customers">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Customers
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              {customer.name}
            </CardTitle>
            <TypeBadge type={customer.type} />
            <StatusBadge status={customer.status} />
          </div>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {customer.email ? (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {customer.email}
              </span>
            ) : null}
            {customer.phone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {customer.phone}
              </span>
            ) : null}
            {customer.city ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {customer.city}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">Total orders</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(customer.totalOrders)}</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">Total value</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(customer.totalValue, customer.currency)}
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(customer.outstanding, customer.currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent orders</CardTitle>
            <CardDescription>Latest sales activity for this customer.</CardDescription>
          </CardHeader>
          <CardContent>
            {customer.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
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
                  {customer.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.number}</TableCell>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.total, order.currency)}
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
              Notes &amp; address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {customer.billingAddress ? (
              <div>
                <p className="font-medium text-muted-foreground">Billing address</p>
                <p className="mt-1">{customer.billingAddress}</p>
              </div>
            ) : null}
            {customer.notes ? (
              <div>
                <p className="font-medium text-muted-foreground">Notes</p>
                <p className="mt-1">{customer.notes}</p>
              </div>
            ) : null}
            {!customer.billingAddress && !customer.notes ? (
              <p className="text-muted-foreground">No notes or billing address on file.</p>
            ) : null}
            <div>
              <p className="font-medium text-muted-foreground">Customer since</p>
              <p className="mt-1">{formatDate(customer.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
