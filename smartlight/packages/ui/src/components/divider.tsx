import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}
export const Divider = ({
  className,
  orientation = 'horizontal',
  ...rest
}: DividerProps): JSX.Element => (
  <div
    role="separator"
    aria-orientation={orientation}
    className={cn(
      orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full',
      'bg-neutral-200',
      className,
    )}
    {...rest}
  />
);