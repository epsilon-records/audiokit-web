import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  numeric?: boolean;
};

type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Stack rows into label/value pairs under 720 px. */
  stackable?: boolean;
};

/**
 * A real table with a caption and scoped headers. Narrow screens get stacked
 * rows via `data-label`, the same pattern the docs field tables use.
 */
export function DataTable<T>({ caption, columns, rows, rowKey, stackable = true }: DataTableProps<T>) {
  return (
    <div className="table-box">
      <table className={stackable ? "stackable" : undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.numeric ? "num" : column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.numeric ? "num" : column.className}
                  data-label={column.header}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
