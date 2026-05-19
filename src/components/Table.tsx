import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider
                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-muted-foreground text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-muted/20 transition-colors"
                style={{
                  animationDelay: `${index * 40}ms`,
                  animation: 'table-row-in 0.35s ease-out both',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <style>{`
        @keyframes table-row-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
