import type { ReactNode } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

type Column<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyMessage: string;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
};

export default function DataTable<T>({
  columns,
  rows,
  loading,
  emptyMessage,
  onPreviousPage,
  onNextPage,
  hasPreviousPage,
  hasNextPage,
}: DataTableProps<T>) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-6 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : null}
          {!loading
            ? rows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
        </TableBody>
      </Table>

      {(onPreviousPage || onNextPage) && (hasPreviousPage || hasNextPage) ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onPreviousPage?.();
                }}
                className={!hasPreviousPage ? "pointer-events-none opacity-40" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onNextPage?.();
                }}
                className={!hasNextPage ? "pointer-events-none opacity-40" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
