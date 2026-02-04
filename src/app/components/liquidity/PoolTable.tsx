import type { ReactNode } from "react";

type PoolTableProps = {
  columns: string[];
  children: ReactNode;
};

export function PoolTable({ columns, children }: PoolTableProps) {
  return (
    <div className="table mt-4">
      <div className="table-head">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      {children}
    </div>
  );
}
