import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
}

export const FormField = ({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className,
  children,
  ...rest
}: FormFieldProps): JSX.Element => (
  <div className={cn('flex flex-col gap-1', className)} {...rest}>
    {label && (
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-neutral-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
    )}
    {children}
    {hint && !error && (
      <p className="text-xs text-neutral-500">{hint}</p>
    )}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);