import { useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'accent-gradient text-white shadow-[0_1px_2px_rgb(16_18_27/0.2),0_6px_16px_-6px_var(--form)] hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:shadow-none',
  secondary:
    'border border-rule bg-sheet text-graphite shadow-card hover:border-rule-strong hover:bg-sheet-2 disabled:text-graphite-soft',
  quiet: 'text-graphite-soft hover:text-graphite hover:bg-sheet-2',
  danger: 'border border-wrong/30 bg-wrong/5 text-wrong hover:bg-wrong/10',
};

export const buttonClass = (variant: Variant = 'primary') =>
  `inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed ${variants[variant]}`;

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${buttonClass(variant)} ${className}`} {...props} />;
}

// A surface card: the building block of the new layout
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-rule bg-sheet shadow-card ${className}`} {...props} />;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'accent' | 'correct' | 'wrong' | 'review'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-sheet-2 text-graphite-soft border-rule',
    accent: 'bg-form-faint text-form border-form/20',
    correct: 'bg-correct/10 text-correct border-correct/20',
    wrong: 'bg-wrong/10 text-wrong border-wrong/20',
    review: 'bg-review/10 text-review border-review/20',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Wordmark() {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 text-[17px] font-bold tracking-tight">
      <span className="accent-gradient inline-flex size-7 items-center justify-center rounded-lg shadow-[0_4px_12px_-4px_var(--form)] transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 6.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      Assess
    </Link>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-16 text-sm text-graphite-soft">
      <span className="size-4 animate-spin rounded-full border-2 border-form/25 border-t-form" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorNote({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="my-8 flex flex-col gap-3 rounded-xl border border-wrong/25 bg-wrong/5 px-4 py-3 text-sm text-graphite">
      <p>{message}</p>
      {action}
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
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-rule bg-sheet p-6 text-graphite shadow-float backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <h2 id={titleId} className="text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </dialog>
  );
}
