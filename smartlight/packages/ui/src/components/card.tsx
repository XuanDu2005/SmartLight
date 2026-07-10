import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export const Card = ({
  className,
  children,
  padded = true,
  ...rest
}: CardProps): JSX.Element => (
  <div
    className={cn(
      'rounded-lg border border-neutral-200 bg-white shadow-card',
      padded && 'p-4 sm:p-6',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

/**
 * CardBody — content section of a Card. Defaults to no extra padding
 * so the Card's outer padding applies once (use this when you want
 * tight tables/grids inside a card without an extra gutter).
 */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}
export const CardBody = ({
  className,
  children,
  ...rest
}: CardBodyProps): JSX.Element => (
  <div className={cn(className)} {...rest}>
    {children}
  </div>
);

export const CardHeader = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): JSX.Element => (
  <div
    className={cn('mb-4 flex items-start justify-between gap-4', className)}
    {...rest}
  >
    {children}
  </div>
);

export const CardTitle = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>): JSX.Element => (
  <h3
    className={cn('text-lg font-semibold text-neutral-900', className)}
    {...rest}
  >
    {children}
  </h3>
);

export const CardDescription = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>): JSX.Element => (
  <p className={cn('text-sm text-neutral-500', className)} {...rest}>
    {children}
  </p>
);

export const CardFooter = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): JSX.Element => (
  <div
    className={cn('mt-4 flex items-center justify-end gap-2 border-t border-neutral-100 pt-4', className)}
    {...rest}
  >
    {children}
  </div>
);