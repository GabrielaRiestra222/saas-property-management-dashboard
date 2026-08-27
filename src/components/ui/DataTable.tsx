import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
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
  sortValue?: (row: T) => string | number;
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
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (row: T) => string;
  getRowId?: (row: T) => string | number;
  selectedIds?: Array<string | number>;
  onSelectionChange?: (ids: Array<string | number>) => void;
  bulkActions?: ReactNode;
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
  searchable,
  searchPlaceholder = "Buscar...",
  getSearchText,
  getRowId,
  selectedIds,
  onSelectionChange,
  bulkActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const selectable = Boolean(getRowId && onSelectionChange);
  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  const filteredRows = useMemo(() => {
    if (!searchable || !getSearchText || !search.trim()) {
      return rows;
    }

    const needle = search.trim().toLowerCase();
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(needle));
  }, [rows, search, searchable, getSearchText]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return filteredRows;
    }

    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) {
      return filteredRows;
    }

    const sorted = [...filteredRows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filteredRows, sortKey, sortDir, columns]);

  function toggleSort(column: Column<T>) {
    if (!column.sortValue) return;

    if (sortKey !== column.key) {
      setSortKey(column.key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
    }
  }

  function toggleRow(id: string | number) {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(Array.from(next));
  }

  function toggleAll() {
    if (!onSelectionChange || !getRowId) return;
    const allIds = sortedRows.map(getRowId);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
    onSelectionChange(allSelected ? [] : allIds);
  }

  const allOnPageSelected =
    selectable && getRowId && sortedRows.length > 0 && sortedRows.every((row) => selectedSet.has(getRowId!(row)));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-2 shadow-sm">
      {searchable || (selectable && selectedSet.size > 0) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
          {searchable ? (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          ) : <span />}
          {selectable && selectedSet.size > 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{selectedSet.size} seleccionada{selectedSet.size === 1 ? "" : "s"}</span>
              {bulkActions}
            </div>
          ) : null}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            {selectable ? (
              <TableHead className="w-10">
                <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} aria-label="Seleccionar todo" />
              </TableHead>
            ) : null}
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {selectable ? (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  ) : null}
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-6 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          {!loading && sortedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                {search ? "Sin resultados para tu búsqueda." : emptyMessage}
              </TableCell>
            </TableRow>
          ) : null}
          {!loading
            ? sortedRows.map((row, index) => {
                const rowId = getRowId?.(row);
                return (
                  <TableRow key={rowId ?? index}>
                    {selectable && rowId !== undefined ? (
                      <TableCell>
                        <Checkbox checked={selectedSet.has(rowId)} onCheckedChange={() => toggleRow(rowId)} aria-label="Seleccionar fila" />
                      </TableCell>
                    ) : null}
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
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
