"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Boxes, CheckCircle2, LayoutGrid, List, Package, PackageSearch, Search, TriangleAlert } from "lucide-react";
import { type Product } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { productsClient } from "@/src/lib/products";
import { NewProductDialog } from "./new-product-dialog";
import { ProductsBoard } from "./products-board";
import { PRODUCT_CATEGORIES, ProductStatusBadge } from "./product-status";

const PAGE_SIZE = 100;

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

export function ProductsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"table" | "board">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdProduct) return;
    const timer = setTimeout(() => setCreatedProduct(null), 5000);
    return () => clearTimeout(timer);
  }, [createdProduct]);

  const listQuery = useQuery({
    queryKey: ["products", "list", debouncedSearch, category],
    queryFn: () =>
      productsClient.list({
        q: debouncedSearch.trim() || undefined,
        category: category === "all" ? undefined : category,
        page: 1,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });

  function createProduct(product: Product) {
    setCreatedProduct(product);
    void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
  }

  const updateProductCategory = useMutation({
    mutationFn: ({ code, category }: { code: string; category: string }) =>
      productsClient.update(code, { category }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const products = listQuery.data?.items ?? [];

  const stats = useMemo(() => {
    const activeCount = products.filter((product) => product.status === "active").length;
    const catalogValue = products.reduce((sum, product) => sum + product.price, 0);
    const lowStockCount = products.filter((product) => product.reorderLevel > 0).length;
    return { activeCount, catalogValue, lowStockCount };
  }, [products]);

  const hasActiveFilters = Boolean(debouncedSearch.trim()) || category !== "all";

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setCategory("all");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Inventory
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the items you buy, sell and stock across your business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="View mode"
            className="inline-flex items-center rounded-md border bg-muted/50 p-0.5"
          >
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              List
            </Button>
            <Button
              variant={view === "board" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Board
            </Button>
          </div>
          <NewProductDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreate={createProduct}
          />
        </div>
      </div>

      {createdProduct ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/inventory/products/${createdProduct.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdProduct.code}
            </Link>{" "}
            · {createdProduct.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <PackageSearch className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your products</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your product catalog. Please try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : listQuery.isLoading || !listQuery.data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Products"
              value={`${products.length}`}
              hint="In catalog"
            />
            <StatCard
              label="Active"
              value={`${stats.activeCount}`}
              hint="Currently sellable"
            />
            <StatCard
              label="Catalog value"
              value={formatCurrency(stats.catalogValue, "USD")}
              hint="Sum of list prices"
            />
            <StatCard
              label="Low stock"
              value={`${stats.lowStockCount}`}
              hint="Items with a reorder level set"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search
                className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {view === "table" ? (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {PRODUCT_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value[0]?.toUpperCase()}
                      {value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          {view === "board" ? (
            <ProductsBoard
              products={products}
              onCategoryChange={(code, newCategory) =>
                updateProductCategory.mutate({ code, category: newCategory })
              }
            />
          ) : (
            <DataTable
              columns={[
                {
                  accessorKey: "name",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
                  cell: ({ row }) => {
                    const product = row.original;
                    return (
                      <div className="flex flex-col">
                        <Link
                          href={`/inventory/products/${product.code}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {product.name}
                        </Link>
                        <span className="text-xs tabular-nums text-muted-foreground">{product.code}</span>
                      </div>
                    );
                  },
                },
                {
                  accessorKey: "category",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
                  cell: ({ row }) => <span className="text-muted-foreground capitalize">{row.original.category}</span>,
                },
                {
                  accessorKey: "unit",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Unit" />,
                  cell: ({ row }) => <span className="text-muted-foreground">{row.original.unit}</span>,
                },
                {
                  accessorKey: "price",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
                  cell: ({ row }) => (
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrency(row.original.price, row.original.currency)}
                    </span>
                  ),
                },
                {
                  accessorKey: "cost",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Cost" />,
                  cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(row.original.cost, row.original.currency)}
                    </span>
                  ),
                },
                {
                  accessorKey: "status",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
                  cell: ({ row }) => <ProductStatusBadge status={row.original.status} />,
                },
                {
                  accessorKey: "reorderLevel",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Reorder level" />,
                  cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">{row.original.reorderLevel}</span>
                  ),
                },
              ]}
              data={products}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              getRowId={(product) => (product as Product).code}
              initialSorting={[{ id: "name", desc: false }]}
              pageSizeOptions={[10, 20, 50]}
              emptyState={{
                icon: <Boxes className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                title: "No products yet",
                description: "Create your first product to start building your catalog.",
                action: (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                    New product
                  </Button>
                ),
              }}
              noResultsState={{
                icon: <TriangleAlert className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                title: "No matching products",
                description: "Try adjusting your search or clearing the filters.",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
