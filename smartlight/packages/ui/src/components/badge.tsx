import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({
  className,
  variant = 'neutral',
  ...rest
}: BadgeProps): JSX.Element => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variantClasses[variant],
      className,
    )}
    {...rest}
  />
);