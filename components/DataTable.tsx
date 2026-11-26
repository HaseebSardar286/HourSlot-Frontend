'use client';

import { useMemo, useState, type ReactNode } from 'react';
import styles from './ui.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Makes the column sortable; return the value to sort by. */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** Hidden on narrow screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Rows per page; 0 shows everything. */
  pageSize?: number;
  /** Initial sort, e.g. { key: 'date', dir: 'desc' }. */
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  /** Extra class per row, e.g. to tint cancelled rows. */
  rowClassName?: (row: T) => string | undefined;
  footer?: ReactNode;
}

/** Dense, sortable, paginated table used by every list page. */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
  onRowClick,
  pageSize = 25,
  defaultSort,
  rowClassName,
  footer,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const val = col.sortValue;
    const out = [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
      return sort.dir === 'asc' ? r : -r;
    });
    return out;
  }, [rows, sort, columns]);

  const pages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = Math.min(page, pages - 1);
  const shown = pageSize > 0 ? sorted.slice(current * pageSize, current * pageSize + pageSize) : sorted;

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  if (rows.length === 0) {
    return (
      <div className={styles.tableEmpty}>
        <i className="fa-regular fa-folder-open" aria-hidden />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} style={{ width: c.width, textAlign: c.align }}
                    className={`${c.hideOnMobile ? styles.hideMobile : ''} ${c.sortValue ? styles.sortable : ''}`}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className={styles.sortBtn}>
                        {c.header}
                        <i className={`fa-solid ${active ? (sort!.dir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} ${active ? styles.sortOn : styles.sortIcon}`} aria-hidden />
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={rowKey(row)}
                className={`${onRowClick ? styles.clickRow : ''} ${rowClassName?.(row) || ''}`}
                style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align }} className={c.hideOnMobile ? styles.hideMobile : undefined}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(pages > 1 || footer) && (
        <div className={styles.tableFoot}>
          <span>
            {pageSize > 0 ? `${current * pageSize + 1}–${Math.min(sorted.length, (current + 1) * pageSize)} of ${sorted.length}` : `${sorted.length} rows`}
          </span>
          {footer}
          {pages > 1 && (
            <div className={styles.pager}>
              <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <span>Page {current + 1} of {pages}</span>
              <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
