import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/auth';
import { TextField } from '../components/fields';
import { Page } from '../components/Layout';
import { Button, Card, ErrorNote } from '../components/ui';

// The signed-in person's own name and password
export function Profile() {
  const { user } = useAuth();
  return (
    <Page>
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">Your profile</h1>
      <p className="mt-2 text-[15px] text-graphite-soft">{user?.email ?? user?.userId}</p>
      <div className="mt-8 grid max-w-xl gap-4">
        <NameCard currentName={user?.name ?? ''} />
        <PasswordCard userId={user?._id ?? ''} />
      </div>
    </Page>
  );
}

function NameCard({ currentName }: { currentName: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName);
  const [state, setState] = useState<{ busy?: boolean; saved?: boolean; error?: string }>({});
  const changed = name.trim() !== currentName && name.trim().length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      await api('PUT', '/auth/me/profile', { name: name.trim() });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      setState({ saved: true });
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : 'Could not save your name.' });
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Name" value={name} onChange={(v) => { setName(v); setState({}); }} maxLength={100} />
        {state.error && <ErrorNote message={state.error} />}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!changed || state.busy}>{state.busy ? 'Saving…' : 'Save name'}</Button>
          {state.saved && <span className="text-sm text-correct">Saved</span>}
        </div>
      </form>
    </Card>
  );
}

function PasswordCard({ userId }: { userId: string }) {
  const { signOut } = useAuth();
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [again, setAgain] = useState('');
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});
  const ready = oldPassword && newPassword.length >= 8 && newPassword.length <= 20 && newPassword === again;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      await api('PUT', `/auth/${userId}/password`, { oldPassword, newPassword });
      // changing the password ends every session, this one included
      signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not change your password.';
      setState({ error: /wrong password/i.test(message) ? 'Your current password is not right.' : message });
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-sm font-bold">Change your password</h2>
        <PasswordField label="Current password" value={oldPassword} onChange={setOld} autoComplete="current-password" />
        <PasswordField label="New password" value={newPassword} onChange={setNew} autoComplete="new-password" hint="8 to 20 characters" />
        <PasswordField label="New password, again" value={again} onChange={setAgain} autoComplete="new-password" />
        {again && newPassword !== again && <p className="text-sm text-wrong">The new passwords do not match.</p>}
        {state.error && <ErrorNote message={state.error} />}
        <Button type="submit" disabled={!ready || state.busy}>{state.busy ? 'Changing…' : 'Change password'}</Button>
        <p className="text-xs text-graphite-soft">You will be signed out everywhere and sign in again with the new password.</p>
      </form>
    </Card>
  );
}

function PasswordField({ label, value, onChange, autoComplete, hint }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input type="password" autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block h-11 w-full rounded-md border border-rule bg-sheet px-3 text-base outline-none focus:border-graphite" />
      {hint && <span className="mt-1 block text-xs text-graphite-soft">{hint}</span>}
    </label>
  );
}
