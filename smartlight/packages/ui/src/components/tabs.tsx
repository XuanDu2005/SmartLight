import { useState, type ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onChange?: (key: string) => void;
  className?: string;
  children?: ReactNode;
}

/**
 * Tabs — accessible simple tabs implementation.
 *
 * - Controlled or uncontrolled.
 * - The `children` is rendered once; consumers should switch views
 *   based on the active tab key (use `<TabsPanel>` for hint-only
 *   styling helpers — they don't actually toggle visibility).
 */
export const Tabs = ({
  items,
  defaultValue,
  value,
  onChange,
  className,
  children,
}: TabsProps): JSX.Element => {
  const [internal, setInternal] = useState<string>(
    defaultValue ?? items[0]?.key ?? '',
  );
  const active = value ?? internal;

  const handleClick = (key: string, disabled?: boolean): void => {
    if (disabled) return;
    if (value === undefined) setInternal(key);
    onChange?.(key);
  };

  return (
    <div className={className}>
      <div className="flex border-b border-neutral-200">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => handleClick(it.key, it.disabled)}
              disabled={it.disabled}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:text-neutral-300',
                isActive
                  ? 'border-smart-600 text-smart-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900',
              )}
            >
              {it.label}
              {typeof it.count === 'number' && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-2 text-xs',
                    isActive
                      ? 'bg-smart-100 text-smart-700'
                      : 'bg-neutral-100 text-neutral-600',
                  )}
                >
                  {it.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};