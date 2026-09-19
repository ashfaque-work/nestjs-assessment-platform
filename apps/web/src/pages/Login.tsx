import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';
import { ApiError } from '../api/client';
import { Bubble } from '../components/Bubble';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, Wordmark } from '../components/ui';
import { letter } from '../lib/format';

// The demo account from the project README; the data behind it is sample data
const DEMO = { userId: 'demo-student@example.com', password: 'DmnTAiBaXDSPM4#7a' };

export function Login() {
  const { signIn, signedIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (signedIn) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(userId.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && (err.status === 400 || err.status === 401)
          ? 'That email and password do not match an account.'
          : err instanceof Error ? err.message : 'Could not sign in. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const useDemo = () => {
    setUserId(DEMO.userId);
    setPassword(DEMO.password);
    setError('');
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Wordmark />
          <ThemeToggle />
        </div>

        <div className="my-auto w-full max-w-sm py-12">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Sign in to take your tests</h1>
          <p className="mt-3 text-graphite-soft">
            A working demo of the assessment platform. Tests, the timer, grading and the answer review all run on the live API, with sample data.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field label="Email" type="email" autoComplete="username" value={userId} onChange={setUserId} />
            <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
            {error && <p role="alert" className="text-sm text-wrong">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !userId || !password}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <button type="button" onClick={useDemo} className="mt-5 text-sm font-semibold text-form underline-offset-4 hover:underline">
            Fill in the demo student account
          </button>
        </div>
      </div>

      <SampleSheet />
    </div>
  );
}

function Field({ label, type, autoComplete, value, onChange }: { label: string; type: string; autoComplete: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1.5 block h-11 w-full rounded-md border border-rule bg-sheet px-3 text-base outline-none transition-colors focus:border-graphite"
      />
    </label>
  );
}

// A few rows of a filled-in answer sheet, printed in form ink
function SampleSheet() {
  const rows = [1, 3, 0, 2, 1, -1, 3, 0, 2, 2, 1, 0];
  return (
    <aside aria-hidden="true" className="hidden items-center justify-center border-l border-rule bg-sheet lg:flex">
      <div className="rotate-[-3deg] rounded-sm border border-form/40 bg-paper px-8 py-7 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]">
        <div className="mb-4 flex items-baseline justify-between gap-10 border-b border-form/40 pb-2 text-form">
          <span className="text-sm font-bold">Answer sheet</span>
          <span className="figures text-xs">Roll no. 0 4 2 7</span>
        </div>
        <ol className="space-y-2.5">
          {rows.map((filled, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="figures w-5 text-right text-xs text-form">{i + 1}</span>
              {[0, 1, 2, 3].map((o) => (
                <Bubble key={o} size="sm" label={letter(o)} state={o === filled ? 'filled' : 'empty'} />
              ))}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
