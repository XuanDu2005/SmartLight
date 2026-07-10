import type { ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  title = 'No data',
  description,
  icon,
  action,
  className,
}: EmptyStateProps): JSX.Element => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center',
      className,
    )}
  >
    {icon && <div className="text-neutral-400">{icon}</div>}
    <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
    {description && (
      <p className="max-w-sm text-sm text-neutral-500">{description}</p>
    )}
    {action}
  </div>
);