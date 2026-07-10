import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, children, ...rest }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'block w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900',
        'transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-smart-500 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
        invalid
          ? 'border-red-500 focus:ring-red-400'
          : 'border-neutral-300 focus:border-smart-500',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';