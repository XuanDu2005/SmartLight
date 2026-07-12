/**
 * React ErrorBoundary for the storefront web app.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] caught', error, info.componentStack);
    this.setState({ info });
  }

  private handleReset = (): void => {
    this.setState({ error: null, info: null });
  };

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 shadow-card">
          <h1 className="text-xl font-semibold">Đã xảy ra lỗi giao diện</h1>
          <p className="mt-2 text-sm">
            Một thành phần trong trang này đã ném lỗi. Chi tiết được ghi vào
            DevTools console.
          </p>
          <pre className="mt-4 max-h-72 overflow-auto rounded bg-white/70 p-3 text-xs leading-relaxed">{`${error.name}: ${error.message}\n${info?.componentStack ?? ''}`}</pre>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={this.handleReset} className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
              Thử lại
            </button>
            <a href="/" className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100">
              Về trang chính
            </a>
          </div>
        </div>
      </div>
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('[window.error]', e.message, e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[unhandledrejection]', e.reason);
  });
}