import { useEffect, type ReactNode } from 'react';
import { Spinner } from './spinner';

export interface LoadingOverlayProps {
  show: boolean;
  label?: ReactNode;
  /** Element to render the overlay above (else it covers the viewport). */
  children?: ReactNode;
  fullscreen?: boolean;
}

export const LoadingOverlay = ({
  show,
  label,
  children,
  fullscreen,
}: LoadingOverlayProps): JSX.Element => {
  useEffect(() => {
    if (!show || !fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show, fullscreen]);

  if (!show) return <>{children}</>;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="flex items-center gap-3 rounded-md bg-white px-5 py-3 shadow-elevated">
          <Spinner size="md" />
          <span className="text-sm text-neutral-700">{label ?? 'Đang tải…'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm shadow-card">
          <Spinner size="sm" />
          <span>{label ?? 'Đang tải…'}</span>
        </div>
      </div>
    </div>
  );
};