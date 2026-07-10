import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
};

export const Spinner = ({
  className,
  size = 'md',
  ...rest
}: SpinnerProps): JSX.Element => (
  <span
    role="status"
    aria-label="Loading"
    className={cn(
      'inline-block animate-spin rounded-full border-current border-r-transparent text-smart-600',
      sizeClasses[size],
      className,
    )}
    {...rest}
  />
);

export const FullPageSpinner = (): JSX.Element => (
  <div className="flex h-[60vh] items-center justify-center">
    <Spinner size="lg" />
  </div>
);