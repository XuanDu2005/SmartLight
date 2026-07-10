import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn.util';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs?: number;
}

/**
 * Toast push accepts either:
 *  - A simple string message (defaults to `info` variant)
 *  - An object with `{ title, description?, variant? }` for richer toasts.
 */
export type ToastPushInput =
  | string
  | {
      title: string;
      description?: string;
      variant?: ToastVariant;
      durationMs?: number;
    };

export interface ToastContextValue {
  toasts: ToastItem[];
  push: (input: ToastPushInput, variant?: ToastVariant) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
};

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-smart-600 text-white',
};

let counter = 0;

export const ToastProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastPushInput, fallbackVariant: ToastVariant = 'info') => {
      counter += 1;
      const id = `toast-${Date.now()}-${counter}`;
      const isString = typeof input === 'string';
      const message = isString
        ? input
        : input.description
          ? `${input.title} — ${input.description}`
          : input.title;
      const variant = isString
        ? fallbackVariant
        : (input.variant ?? fallbackVariant);
      const durationMs = isString ? 4000 : (input.durationMs ?? 4000);
      setToasts((prev) => [
        ...prev,
        { id, message, variant, durationMs },
      ]);
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto min-w-[260px] max-w-md rounded-md px-4 py-2 text-sm shadow-elevated animate-[fadeIn_120ms_ease-out]',
              variantClasses[t.variant],
            )}
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};