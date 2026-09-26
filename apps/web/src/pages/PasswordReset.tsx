import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, ErrorNote, Spinner, Wordmark } from '../components/ui';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-6 sm:px-10">
      <div className="flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-sm py-16">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Input({ label, type = 'text', autoComplete, value, onChange, hint }: {
  label: string; type?: string; autoComplete: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input type={type} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block h-11 w-full rounded-lg border border-rule bg-sheet px-3.5 text-base outline-none transition-shadow focus:border-form focus:ring-4 focus:ring-[var(--ring)]/20" />
      {hint && <span className="mt-1 block text-xs text-graphite-soft">{hint}</span>}
    </label>
  );
}

// Ask for a link to set a new password. The answer is the same whether or not the email has an
// account, so the page never says which.
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<{ busy?: boolean; sent?: boolean; error?: string }>({});
  const ready = /.+@.+\..+/.test(email.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      await api('POST', '/auth/recoverPassword', { type: 'email', email: email.trim().toLowerCase() });
      setState({ sent: true });
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : 'Could not send the link. Try again.' });
    }
  };

  return (
    <Shell title="Forgot your password?">
      {state.sent ? (
        <p className="mt-3 text-graphite-soft" role="status">
          If {email.trim()} has an account, a link to set a new password is on its way. It works for an hour.
        </p>
      ) : (
        <>
          <p className="mt-3 text-graphite-soft">Enter your email and we will send you a link to set a new one.</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} />
            {state.error && <p role="alert" className="text-sm text-wrong">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={!ready || state.busy}>{state.busy ? 'Sending…' : 'Send the link'}</Button>
          </form>
        </>
      )}
      <p className="mt-6 text-sm text-graphite-soft">
        <Link to="/login" className="font-semibold text-form hover:underline">Back to sign in</Link>
      </p>
    </Shell>
  );
}

// The page the emailed link opens: /set-password?token=...
export function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [account, setAccount] = useState<{ _id: string; name?: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [state, setState] = useState<{ busy?: boolean; done?: boolean; error?: string }>({});

  useEffect(() => {
    if (!token) { setChecking(false); setLinkError('This link has no reset code. Ask for a new link.'); return; }
    api<{ user?: { _id: string; name?: string } }>('GET', `/auth/confirmPasswordResetToken/${encodeURIComponent(token)}`)
      .then((r) => { if (r.user?._id) setAccount(r.user); else setLinkError('This link is not valid or has expired. Ask for a new one.'); })
      .catch(() => setLinkError('This link is not valid or has expired. Ask for a new one.'))
      .finally(() => setChecking(false));
  }, [token]);

  const ready = password.length >= 8 && password.length <= 20 && password === again;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setState({ busy: true });
    try {
      await api('PUT', `/auth/${account._id}/newPassword`, { newPassword: password, token });
      setState({ done: true });
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : 'Could not set the password.' });
    }
  };

  return (
    <Shell title="Set a new password">
      {checking && <Spinner label="Checking the link" />}
      {linkError && (
        <ErrorNote message={linkError} action={<Link to="/forgot-password" className="font-semibold text-form hover:underline">Ask for a new link</Link>} />
      )}
      {account && (state.done ? (
        <p className="mt-3 text-graphite-soft" role="status">
          Your password is set. <Link to="/login" className="font-semibold text-form hover:underline">Sign in</Link>
        </p>
      ) : (
        <>
          <p className="mt-3 text-graphite-soft">{account.name ? `For ${account.name}.` : ''} Choose a password of 8 to 20 characters.</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint="8 to 20 characters" />
            <Input label="New password, again" type="password" autoComplete="new-password" value={again} onChange={setAgain} />
            {again && password !== again && <p className="text-sm text-wrong">The passwords do not match.</p>}
            {state.error && <p role="alert" className="text-sm text-wrong">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={!ready || state.busy}>{state.busy ? 'Saving…' : 'Set password'}</Button>
          </form>
        </>
      ))}
    </Shell>
  );
}
