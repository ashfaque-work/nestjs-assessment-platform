import { Link } from 'react-router-dom';
import { useMyAttempts, useOpenTests } from '../api/hooks';
import type { Attempt, TestSummary } from '../api/types';
import { useAuth } from '../auth/auth';
import { Page } from '../components/Layout';
import { Badge, buttonClass, Card, ErrorNote, Spinner } from '../components/ui';
import { day, marks, percent, plural } from '../lib/format';

// Only attempts the student finished: started-and-left ones are not results
const finished = (attempts: Attempt[] = []) => attempts.filter((a) => !a.ongoing && !a.isAbandoned && a.totalQuestions > 0);

export function Dashboard() {
  const { user } = useAuth();
  const tests = useOpenTests();
  const attempts = useMyAttempts();
  const done = finished(attempts.data);
  const firstName = user?.name?.split(' ')[0];

  const lastByTest = new Map<string, Attempt>();
  for (const a of done) if (!lastByTest.has(a.practicesetId)) lastByTest.set(a.practicesetId, a);

  const answered = done.reduce((n, a) => n + a.totalQuestions, 0);
  const correct = done.reduce((n, a) => n + a.totalCorrects, 0);
  const accuracy = answered ? percent(correct, answered) : null;

  return (
    <Page>
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">{firstName ? `Hello, ${firstName}` : 'Your tests'}</h1>
      <p className="mt-2 max-w-prose text-[15px] text-graphite-soft">
        {tests.data
          ? tests.data.length
            ? `${plural(tests.data.length, 'test is', 'tests are')} open to you.`
            : 'No tests are open to you right now.'
          : 'Loading your tests.'}
      </p>

      {done.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          <Stat label="Tests taken" value={String(done.length)} />
          <Stat label="Questions answered" value={String(answered)} />
          <Stat label="Accuracy" value={accuracy === null ? '—' : `${accuracy}%`} accent />
        </div>
      )}

      <section aria-labelledby="open-tests" className="mt-12">
        <h2 id="open-tests" className="text-xs font-semibold uppercase tracking-wider text-graphite-soft">Open tests</h2>
        {tests.isPending && <Spinner label="Loading tests" />}
        {tests.isError && <ErrorNote message={tests.error.message} />}
        {tests.data && tests.data.length === 0 && (
          <Card className="mt-3 px-5 py-8 text-center text-sm text-graphite-soft">No tests are open to you right now.</Card>
        )}
        {tests.data && tests.data.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {tests.data.map((test) => (
              <TestCard key={test._id} test={test} last={lastByTest.get(test._id)} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="results" className="mt-12">
        <h2 id="results" className="text-xs font-semibold uppercase tracking-wider text-graphite-soft">Your results</h2>
        {attempts.isPending && <Spinner label="Loading results" />}
        {attempts.isError && <ErrorNote message={attempts.error.message} />}
        {attempts.data && done.length === 0 && (
          <Card className="mt-3 px-5 py-8 text-center text-sm text-graphite-soft">Your results will show here after you finish a test.</Card>
        )}
        {done.length > 0 && (
          <Card className="mt-3 divide-y divide-rule overflow-hidden">
            {done.map((a, i) => (
              <ResultRow key={a._id ?? i} attempt={a} />
            ))}
          </Card>
        )}
      </section>
    </Page>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-graphite-soft">{label}</p>
      <p className={`figures mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${accent ? 'accent-text' : ''}`}>{value}</p>
    </Card>
  );
}

function TestCard({ test, last }: { test: TestSummary; last?: Attempt }) {
  const questions = test.totalQuestion || test.questions?.length || 0;
  return (
    <li>
      <Card className="flex h-full flex-col gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-pop">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {test.subjects.map((s) => (
              <Badge key={s._id ?? s.name} tone="accent">{s.name}</Badge>
            ))}
          </div>
          <h3 className="mt-3 text-lg font-bold leading-snug">{test.title}</h3>
          <p className="figures mt-1.5 text-sm text-graphite-soft">
            {questions ? `${plural(questions, 'question')} · ` : ''}
            {test.totalTime} min
            {last && ` · last ${marks(last.totalMark)}/${marks(last.maximumMarks)}`}
          </p>
        </div>
        <Link to={`/tests/${test._id}`} className={`${buttonClass(last ? 'secondary' : 'primary')} w-full`}>
          {last ? 'Take again' : 'Start test'}
        </Link>
      </Card>
    </li>
  );
}

function ResultRow({ attempt }: { attempt: Attempt }) {
  const score = percent(attempt.totalMark, attempt.maximumMarks);
  return (
    <Link
      to={`/results/${attempt._id}`}
      className="grid items-center gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-sheet-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{attempt.practiceSetInfo?.title ?? 'Test'}</p>
        <p className="text-sm text-graphite-soft">{day(attempt.createdAt)}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-sheet-2" aria-hidden="true">
          <span className="accent-gradient block h-full rounded-full" style={{ width: `${Math.max(4, score)}%` }} />
        </span>
        <span className="figures w-16 text-right text-sm font-semibold">
          {marks(attempt.totalMark)}/{marks(attempt.maximumMarks)}
        </span>
      </div>
      <span className="text-sm font-semibold text-form">See answers →</span>
    </Link>
  );
}
