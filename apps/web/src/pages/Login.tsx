import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';
import { ApiError } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, Wordmark } from '../components/ui';

// The demo accounts; the data behind them is sample data, put back every night
const DEMO = {
  student: { userId: 'demo-student@example.com', password: 'DmnTAiBaXDSPM4#7a' },
  teacher: { userId: 'demo-teacher@example.com', password: "DmvYOo2D-9ZyV-#7a" },
  admin: { userId: 'demo-admin@example.com', password: 'DmblBUpCozLEXX#7a' },
};

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

  const useDemo = (who: keyof typeof DEMO) => {
    setUserId(DEMO[who].userId);
    setPassword(DEMO[who].password);
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
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Sign in to your tests</h1>
          <p className="mt-3 text-graphite-soft">
            A working demo of the assessment platform. Students take timed tests and review every answer; teachers write tests and see how the class did; admins manage people and settings. It all runs on the live API, with sample data.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field label="Email" type="email" autoComplete="username" value={userId} onChange={setUserId} />
            <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
            {error && <p role="alert" className="text-sm text-wrong">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !userId || !password}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-graphite-soft">
            <span>Try it as</span>
            <button type="button" onClick={() => useDemo('student')} className="rounded-full border border-rule bg-sheet px-3 py-1 font-semibold text-graphite shadow-card transition-colors hover:border-form/40 hover:text-form">
              Demo student
            </button>
            <button type="button" onClick={() => useDemo('teacher')} className="rounded-full border border-rule bg-sheet px-3 py-1 font-semibold text-graphite shadow-card transition-colors hover:border-form/40 hover:text-form">
              Demo teacher
            </button>
            <button type="button" onClick={() => useDemo('admin')} className="rounded-full border border-rule bg-sheet px-3 py-1 font-semibold text-graphite shadow-card transition-colors hover:border-form/40 hover:text-form">
              Demo admin
            </button>
          </div>
        </div>
      </div>

      <Showcase />
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
        className="mt-1.5 block h-11 w-full rounded-lg border border-rule bg-sheet px-3.5 text-base outline-none transition-shadow placeholder:text-graphite-soft focus:border-form focus:ring-4 focus:ring-[var(--ring)]/20"
      />
    </label>
  );
}

// A modern gradient panel with a floating "result" card — the premium product feel
function Showcase() {
  return (
    <aside aria-hidden="true" className="relative hidden items-center justify-center overflow-hidden lg:flex">
      <div className="accent-gradient absolute inset-0 opacity-95" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 40%)' }} />
      <div className="relative w-[min(24rem,80%)] rotate-[-2deg] rounded-2xl border border-white/20 bg-white/95 p-6 text-graphite shadow-[0_40px_80px_-30px_rgb(0_0_0/0.5)] backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-graphite-soft">Linear &amp; quadratic equations</p>
          <span className="rounded-full bg-correct/10 px-2.5 py-0.5 text-xs font-semibold text-correct">Passed</span>
        </div>
        <p className="figures mt-4 text-5xl font-bold tracking-tight">
          92<span className="text-2xl text-graphite-soft">%</span>
        </p>
        <p className="text-sm text-graphite-soft">11 of 12 correct · 8 min</p>
        <div className="mt-5 space-y-2.5">
          {[
            { label: 'Algebra', v: 100 },
            { label: 'Graphs', v: 83 },
            { label: 'Word problems', v: 90 },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-medium text-graphite-soft">{s.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-sheet-2">
                <span className="accent-gradient block h-full rounded-full" style={{ width: `${s.v}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
