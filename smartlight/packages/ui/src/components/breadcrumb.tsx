import type { ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb — visual path indicator.
 *
 * Last item is rendered as a static span (current page).
 * Earlier items render as <a> when `href` is set, otherwise as
 * <button> when `onClick` is set, otherwise as plain text.
 *
 * The component is intentionally router-agnostic so it can live in
 * the UI package. Callers wrap with their own router link when
 * needed by setting `href` directly.
 */
export const Breadcrumb = ({ items, className }: BreadcrumbProps): JSX.Element => (
  <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
    <ol className="flex flex-wrap items-center gap-1 text-neutral-500">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const baseClass = cn(
          'transition-colors',
          !isLast && 'hover:text-smart-700 hover:underline',
        );
        const activeClass = isLast ? 'text-neutral-900 font-medium' : '';
        return (
          <li key={i} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <a href={item.href} className={cn(baseClass, activeClass)}>
                {item.label}
              </a>
            ) : item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className={cn(baseClass, activeClass)}
              >
                {item.label}
              </button>
            ) : (
              <span className={activeClass} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {!isLast && <span className="text-neutral-300">/</span>}
          </li>
        );
      })}
    </ol>
  </nav>
);