import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn.util';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<InputProps['inputSize']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, invalid = false, inputSize = 'md', type = 'text', ...rest },
    ref,
  ) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'block w-full rounded-md border bg-white text-neutral-900 placeholder-neutral-400',
        'transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-smart-500 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
        invalid
          ? 'border-red-500 focus:ring-red-400'
          : 'border-neutral-300 focus:border-smart-500',
        sizeClasses[inputSize],
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';