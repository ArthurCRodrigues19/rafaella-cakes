import type { ReactNode } from 'react';
import { CUSTOM_STATUS, ORDER_STATUS } from '@/lib/format';
import type { CustomOrderStatus, OrderStatus } from '@/lib/types';
import { StarIcon } from './icons';

/** Pequenos componentes visuais reutilizáveis. */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  as: Tag = 'h2',
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  as?: 'h1' | 'h2';
}) {
  return (
    <div className={`mb-10 ${align === 'center' ? 'mx-auto max-w-2xl text-center' : ''}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <Tag className="heading-lg text-balance">{title}</Tag>
      {subtitle && <p className="mt-4 leading-relaxed text-cocoa-500">{subtitle}</p>}
    </div>
  );
}

export function Stars({ value, size = 16, label = true }: { value: number; size?: number; label?: boolean }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5 text-champagne-500" aria-label={label ? `${value.toFixed(1)} de 5 estrelas` : undefined} role={label ? 'img' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rounded} width={size} height={size} className={n <= rounded ? '' : 'text-cocoa-200'} />
      ))}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${s.tone}`}>{s.label}</span>;
}

export function CustomStatusBadge({ status }: { status: CustomOrderStatus }) {
  const s = CUSTOM_STATUS[status];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${s.tone}`}>{s.label}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 font-script text-5xl text-blush-400" aria-hidden>
        ♥
      </div>
      <h2 className="heading-md">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-cocoa-500">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = '',
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-cocoa-400">{hint}</p>}
      {error && (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success' | 'warning'; children: ReactNode }) {
  const styles = {
    info: 'bg-blush-50 text-cocoa-700 ring-blush-200',
    error: 'bg-red-50 text-red-800 ring-red-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${styles}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden
    />
  );
}
