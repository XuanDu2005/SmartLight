import { useEffect, type ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-72',
  md: 'w-96',
  lg: 'w-[480px]',
  xl: 'w-[640px]',
};

/**
 * Drawer — a slide-in side panel for filters, previews, etc.
 *
 * Renders to a fixed overlay on top of the page with body scroll lock.
 * `Esc` and click-on-overlay both close it.
 */
export const Drawer = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
  className,
}: DrawerProps): JSX.Element | null => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-black/40"
      onClick={onClose}
    >
      <div
        className={cn(
          'absolute top-0 flex h-full max-w-full flex-col bg-white shadow-elevated transition-transform',
          side === 'right' ? 'right-0' : 'left-0',
          sizeClasses[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="border-b border-neutral-100 px-5 py-4">
            {title && (
              <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            )}
          </div>
        )}
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};