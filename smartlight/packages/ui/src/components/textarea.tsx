import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, rows = 3, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'block w-full rounded-md border bg-white text-sm text-neutral-900 placeholder-neutral-400',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-smart-500 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
        invalid
          ? 'border-red-500 focus:ring-red-400'
          : 'border-neutral-300 focus:border-smart-500',
        'px-3 py-2',
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';