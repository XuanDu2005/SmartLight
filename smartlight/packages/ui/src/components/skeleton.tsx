import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

/**
 * Skeleton — a light-weight placeholder box used during loading.
 * Pulses subtly so users can see content is coming.
 */
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({
  className,
  variant = 'rect',
  width,
  height,
  style,
  ...rest
}: SkeletonProps): JSX.Element => {
  const variantClasses =
    variant === 'text'
      ? 'h-3 rounded'
      : variant === 'circle'
        ? 'rounded-full'
        : 'rounded-md';

  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse bg-neutral-200/80 dark:bg-neutral-800/80',
        variantClasses,
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...rest}
    />
  );
};

/**
 * SkeletonText — composes a text-style skeleton block stack
 * (headline + N body lines).
 */
export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}
export const SkeletonText = ({
  lines = 3,
  className,
}: SkeletonTextProps): JSX.Element => (
  <div className={cn('space-y-2', className)}>
    <Skeleton variant="text" className="h-4 w-1/3" />
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={i === lines - 1 ? 'w-2/3' : 'w-full'}
      />
    ))}
  </div>
);
