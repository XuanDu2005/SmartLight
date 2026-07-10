import type { ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

const buildRange = (
  page: number,
  total: number,
  siblings: number,
): Array<number | '...'> => {
  const range: Array<number | '...'> = [];
  const start = Math.max(2, page - siblings);
  const end = Math.min(total - 1, page + siblings);
  range.push(1);
  if (start > 2) range.push('...');
  for (let i = start; i <= end; i++) range.push(i);
  if (end < total - 1) range.push('...');
  if (total > 1) range.push(total);
  return range;
};

const btnBase =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors';
const btnIdle = 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50';
const btnActive = 'border-smart-600 bg-smart-600 text-white';

const NavBtn = ({
  children,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
}): JSX.Element => (
  <button
    type="button"
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={onClick}
    className={cn(btnBase, btnIdle, 'disabled:cursor-not-allowed disabled:text-neutral-300')}
  >
    {children}
  </button>
);

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps): JSX.Element | null => {
  if (totalPages <= 1) return null;
  const range = buildRange(page, totalPages, siblingCount);
  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center gap-2', className)}
    >
      <NavBtn
        ariaLabel="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹
      </NavBtn>
      {range.map((item, idx) =>
        item === '...' ? (
          <span key={`dots-${idx}`} className="px-2 text-neutral-400">
            …
          </span>
        ) : (
          <button
            type="button"
            key={item}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className={cn(btnBase, item === page ? btnActive : btnIdle)}
          >
            {item}
          </button>
        ),
      )}
      <NavBtn
        ariaLabel="Next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </NavBtn>
    </nav>
  );
};