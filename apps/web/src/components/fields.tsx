import { useId, type ReactNode } from 'react';

const base =
  'mt-1.5 block rounded-md border border-rule bg-sheet px-3 text-base outline-none transition-colors focus:border-graphite disabled:cursor-not-allowed disabled:text-graphite-soft';
const control = `${base} w-full`;

function Label({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-graphite-soft">{hint}</p>}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, maxLength, disabled, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; maxLength?: number; disabled?: boolean; placeholder?: string;
}) {
  const id = useId();
  return (
    <Label id={id} label={label} hint={hint}>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} disabled={disabled} placeholder={placeholder} className={`${control} h-11`} />
    </Label>
  );
}

export function TextArea({ label, value, onChange, hint, rows = 3, disabled, serif, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number; disabled?: boolean; serif?: boolean; placeholder?: string;
}) {
  const id = useId();
  return (
    <Label id={id} label={label} hint={hint}>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} disabled={disabled} placeholder={placeholder}
        className={`${control} py-2.5 leading-relaxed ${serif ? 'font-serif text-[17px]' : ''}`} />
    </Label>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix, disabled }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; disabled?: boolean;
}) {
  const id = useId();
  return (
    <Label id={id} label={label}>
      <div className="flex items-center gap-2">
        <input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={step} disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} className={`${base} figures h-11 w-28`} />
        {suffix && <span className="mt-1.5 text-sm text-graphite-soft">{suffix}</span>}
      </div>
    </Label>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, placeholder, disabled, hint }: {
  label: string; value: T | ''; onChange: (v: T) => void; options: { value: T; label: string }[]; placeholder: string; disabled?: boolean; hint?: string;
}) {
  const id = useId();
  return (
    <Label id={id} label={label} hint={hint}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled} className={`${control} h-11`}>
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Label>
  );
}
