import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/auth';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, Wordmark } from '../components/ui';

// A student makes their own account, then is signed in straight away
export function Signup() {
  const { signIn, signedIn } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (signedIn) return <Navigate to="/" replace />;

  const ready = name.trim().length > 0 && /.+@.+\..+/.test(email.trim()) && password.length >= 8 && password.length <= 20;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setError('');
    setBusy(true);
    try {
      const login = email.trim().toLowerCase();
      await api('POST', '/auth/users', { name: name.trim(), userId: login, email: login, password, userRoles: ['student'] });
      await signIn(login, password);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create the account. Try again.';
      setError(/already in use/i.test(message) ? 'An account with this email already exists. Sign in instead.' : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh px-4 py-6 sm:px-10">
      <div className="flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-sm py-16">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Create your account</h1>
        <p className="mt-3 text-graphite-soft">Take the tests your school has open to you and review every answer.</p>

        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          <Field label="Name" autoComplete="name" value={name} onChange={setName} />
          <Field label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} />
          <Field label="Password" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint="8 to 20 characters" />
          {error && <p role="alert" className="text-sm text-wrong">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !ready}>{busy ? 'Creating your account…' : 'Create account'}</Button>
        </form>
        <p className="mt-6 text-sm text-graphite-soft">
          Have an account? <Link to="/login" className="font-semibold text-form hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', autoComplete, value, onChange, hint }: {
  label: string; type?: string; autoComplete: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1.5 block h-11 w-full rounded-lg border border-rule bg-sheet px-3.5 text-base outline-none transition-shadow focus:border-form focus:ring-4 focus:ring-[var(--ring)]/20"
      />
      {hint && <span className="mt-1 block text-xs text-graphite-soft">{hint}</span>}
    </label>
  );
}
