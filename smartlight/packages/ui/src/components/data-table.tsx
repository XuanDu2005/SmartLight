import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

/**
 * DataTable — generic, accessible data table with sticky header
 * support. Designed for admin screens.
 *
 * Use a render-typed wrapper (see `apps/admin/.../components/data-table.tsx`)
 * that fixes the row type so consumers don't have to repeat it.
 *
 * `striped` toggles zebra striping.
 * `stickyHeader` keeps the header at the top during scroll.
 * `density` toggles row padding (compact / comfortable).
 */
export interface DataTableProps extends HTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  stickyHeader?: boolean;
  density?: 'compact' | 'comfortable';
}

export const DataTable = ({
  className,
  striped,
  stickyHeader,
  density = 'comfortable',
  ...rest
}: DataTableProps): JSX.Element => (
  <div className="overflow-auto rounded-md border border-neutral-200">
    <table
      className={cn(
        'w-full border-collapse text-sm',
        striped && '[&_tbody_tr:nth-child(even)]:bg-neutral-50/50',
        stickyHeader &&
          '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-neutral-50',
        className,
      )}
      {...rest}
    />
  </div>
);

export interface DataTableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {}
export const DataTableHead = ({
  className,
  ...rest
}: DataTableHeadProps): JSX.Element => (
  <thead
    className={cn(
      'bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500',
      className,
    )}
    {...rest}
  />
);

export interface DataTableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}
export const DataTableBody = ({
  className,
  ...rest
}: DataTableBodyProps): JSX.Element => <tbody className={cn('', className)} {...rest} />;

export interface DataTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  density?: 'compact' | 'comfortable';
}
export const DataTableRow = ({
  className,
  density = 'comfortable',
  ...rest
}: DataTableRowProps): JSX.Element => (
  <tr
    className={cn(
      'border-t border-neutral-100 transition-colors hover:bg-neutral-50/70',
      className,
    )}
    {...rest}
  />
);

export interface DataTableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  density?: 'compact' | 'comfortable';
}
export const DataTableHeaderCell = ({
  className,
  density = 'comfortable',
  ...rest
}: DataTableHeaderCellProps): JSX.Element => (
  <th
    className={cn(
      'text-left font-medium',
      density === 'compact' ? 'px-3 py-2' : 'px-4 py-2',
      className,
    )}
    {...rest}
  />
);

export interface DataTableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  density?: 'compact' | 'comfortable';
}
export const DataTableCell = ({
  className,
  density = 'comfortable',
  ...rest
}: DataTableCellProps): JSX.Element => (
  <td
    className={cn(
      'align-middle text-neutral-800',
      density === 'compact' ? 'px-3 py-2' : 'px-4 py-3',
      className,
    )}
    {...rest}
  />
);