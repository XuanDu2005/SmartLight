import { useEffect, type ReactNode } from 'react';
import { Button } from './button';
import { cn } from '../utils/cn.util';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

/**
 * ConfirmDialog — modal that asks the user to confirm a destructive
 * (or otherwise important) action. Built on top of the Modal
 * styling but kept separate so consumers don't need to compose it
 * manually.
 */
export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Huỷ',
  variant = 'primary',
  isLoading = false,
}: ConfirmDialogProps): JSX.Element | null => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-lg bg-white shadow-elevated',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          {description && (
            <p className="mt-2 text-sm text-neutral-600">{description}</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-3">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};