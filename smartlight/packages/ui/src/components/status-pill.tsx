import type { ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface StatusPillProps {
  status: string;
  /** Map status → variant. Falls back to neutral. */
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  label?: ReactNode;
  className?: string;
}

const variantClasses = {
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-neutral-100 text-neutral-700',
};

/**
 * StatusPill — small pill used to flag entity status across
 * admin screens. Differs from `Badge` by being reserved for
 * status-specific use cases (with a status → variant mapping).
 */
export const StatusPill = ({
  status,
  variant = 'neutral',
  label,
  className,
}: StatusPillProps): JSX.Element => (
  <span
    data-status={status}
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variantClasses[variant],
      className,
    )}
  >
    {label ?? status}
  </span>
);