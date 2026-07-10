import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

export const Table = ({
  className,
  children,
  ...rest
}: TableHTMLAttributes<HTMLTableElement>): JSX.Element => (
  <div className="overflow-hidden rounded-md border border-neutral-200">
    <table
      className={cn('w-full border-collapse text-sm', className)}
      {...rest}
    >
      {children}
    </table>
  </div>
);

export const THead = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>): JSX.Element => (
  <thead
    className={cn('bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500', className)}
    {...rest}
  >
    {children}
  </thead>
);

export const TH = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableCellElement>): JSX.Element => (
  <th
    className={cn('px-4 py-2 text-left font-medium', className)}
    {...rest}
  >
    {children}
  </th>
);

export const TR = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>): JSX.Element => (
  <tr
    className={cn('border-t border-neutral-100 transition-colors hover:bg-neutral-50', className)}
    {...rest}
  >
    {children}
  </tr>
);

export const TD = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableCellElement>): JSX.Element => (
  <td className={cn('px-4 py-3 align-middle text-neutral-800', className)} {...rest}>
    {children}
  </td>
);