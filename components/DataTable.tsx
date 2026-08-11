'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="glass-card text-center" style={{ padding: 32, color: 'var(--text-secondary)' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
            {columns.map((c) => (
              <th key={c.key} style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} style={{ borderBottom: '1px solid var(--border-color)' }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
