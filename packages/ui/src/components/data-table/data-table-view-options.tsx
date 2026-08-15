"use client";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Settings2 } from "lucide-react";
import * as React from "react";
import type { LegacyReactTable } from "@tanstack/react-table/legacy";
import type { RowData } from "@tanstack/react-table";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "../dropdown-menu";

type DataTableDensity = "comfortable" | "compact" | "spacious";

interface DataTableViewOptionsProps<TData extends RowData> {
  table: LegacyReactTable<TData>;
  density: DataTableDensity;
  onDensityChange: (density: DataTableDensity) => void;
  densityLabel: string;
}

function DataTableViewOptions<TData extends RowData>({
  table,
  density,
  onDensityChange,
  densityLabel,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
          aria-label="View options"
        >
          <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Density</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={density}
          onValueChange={(value) => onDensityChange(value as DataTableDensity)}
        >
          <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
          .map((column) => {
            const label = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {label}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
      <span className="sr-only">{densityLabel}</span>
    </DropdownMenu>
  );
}

export { DataTableViewOptions, type DataTableDensity };
