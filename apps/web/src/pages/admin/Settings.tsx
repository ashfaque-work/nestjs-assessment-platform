import { useEffect, useState, type FormEvent } from 'react';
import { useSaveWhiteLabel, useWhiteLabel } from '../../api/admin';
import type { WhiteLabel } from '../../api/types';
import { Page } from '../../components/Layout';
import { Button, Card, ErrorNote, Spinner } from '../../components/ui';

// The white-label fields the admin edits here (the settings document has many more, which we send
// back untouched).
const TEXT_FIELDS: { key: keyof WhiteLabel; label: string; hint?: string }[] = [
  { key: 'productName', label: 'Product name' },
  { key: 'pageTitle', label: 'Browser tab title' },
  { key: 'supportEmail', label: 'Support email' },
  { key: 'adminName', label: 'Admin display name' },
  { key: 'copyRight', label: 'Copyright line' },
  { key: 'signupMsg', label: 'Sign-up message' },
];
const TOGGLES: { key: keyof WhiteLabel; label: string; hint: string }[] = [
  { key: 'isWhiteLabelled', label: 'White-labelled', hint: 'Hide the platform vendor branding' },
  { key: 'detectFraud', label: 'Fraud detection', hint: 'Flag suspicious behaviour during tests' },
  { key: 'allowMarksChange', label: 'Allow marks change', hint: 'Let teachers override a graded score' },
];

export function AdminSettings() {
  const wl = useWhiteLabel();
  const save = useSaveWhiteLabel();
  const [form, setForm] = useState<WhiteLabel | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (wl.data && !form) setForm({ ...wl.data });
  }, [wl.data, form]);

  const set = (key: keyof WhiteLabel, value: unknown) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    await save.mutateAsync(form);
    setSaved(true);
  };

  return (
    <Page>
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">Platform settings</h1>
      <p className="mt-2 text-[15px] text-graphite-soft">Branding and behaviour for everyone on this instance.</p>

      {wl.isPending && <Spinner label="Loading settings" />}
      {wl.isError && <ErrorNote message={wl.error.message} />}

      {form && (
        <form onSubmit={submit} className="mt-8 grid max-w-3xl gap-4">
          <Card className="grid gap-5 p-6 sm:grid-cols-2">
            {TEXT_FIELDS.map((f) => (
              <label key={String(f.key)} className={f.key === 'signupMsg' ? 'sm:col-span-2' : ''}>
                <span className="text-sm font-semibold">{f.label}</span>
                <input
                  value={(form[f.key] as string) ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="mt-1.5 block h-11 w-full rounded-lg border border-rule bg-sheet px-3.5 text-base outline-none transition-shadow focus:border-form focus:ring-4 focus:ring-[var(--ring)]/20"
                />
              </label>
            ))}
            <label className="flex items-center gap-3">
              <span className="text-sm font-semibold">Theme colour</span>
              <input
                type="color"
                value={(form.themeColor as string) ?? '#6d5efc'}
                onChange={(e) => set('themeColor', e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-rule bg-sheet"
              />
              <span className="figures text-sm text-graphite-soft">{(form.themeColor as string) ?? ''}</span>
            </label>
          </Card>

          <Card className="divide-y divide-rule overflow-hidden">
            {TOGGLES.map((t) => (
              <label key={String(t.key)} className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4">
                <span>
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block text-sm text-graphite-soft">{t.hint}</span>
                </span>
                <Toggle on={!!form[t.key]} onChange={(v) => set(t.key, v)} />
              </label>
            ))}
          </Card>

          {save.isError && <ErrorNote message={(save.error as Error).message} />}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
            {saved && !save.isPending && <span className="text-sm font-semibold text-correct">Saved</span>}
          </div>
        </form>
      )}
    </Page>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'accent-gradient' : 'bg-rule-strong'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}
