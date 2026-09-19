import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'quiet';

const variants: Record<Variant, string> = {
  primary: 'bg-graphite text-paper hover:bg-graphite/85 disabled:bg-graphite/40',
  secondary: 'border border-rule bg-sheet text-graphite hover:border-graphite-soft disabled:text-graphite-soft',
  quiet: 'text-graphite-soft hover:text-graphite hover:bg-rule/50',
};

export const buttonClass = (variant: Variant = 'primary') =>
  `inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]}`;

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function Wordmark() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-[17px] font-bold tracking-tight">
      <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--form)" strokeWidth="3" />
        <circle cx="16" cy="16" r="8" fill="currentColor" />
      </svg>
      Assess
    </Link>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-16 text-sm text-graphite-soft">
      <span className="size-4 animate-spin rounded-full border-2 border-form/30 border-t-form" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorNote({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="my-8 border-l-2 border-wrong bg-sheet px-4 py-3 text-sm">
      <p>{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// A modal dialog built on <dialog>, so focus and Escape behave natively
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // each dialog needs its own title id: a page can hold several, and a shared id names them all alike
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-rule bg-sheet p-6 text-graphite shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)] backdrop:bg-black/50"
    >
      <h2 id={titleId} className="text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </dialog>
  );
}
