import { Link } from 'react-router-dom';
import { useMyAttempts, useOpenTests } from '../api/hooks';
import type { Attempt, TestSummary } from '../api/types';
import { useAuth } from '../auth/auth';
import { Page } from '../components/Layout';
import { buttonClass, ErrorNote, Spinner } from '../components/ui';
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

  return (
    <Page>
      <h1 className="text-[32px] font-bold leading-tight tracking-tight">{firstName ? `Hello, ${firstName}` : 'Your tests'}</h1>
      <p className="mt-2 max-w-prose text-graphite-soft">
        {tests.data
          ? tests.data.length
            ? `${plural(tests.data.length, 'test is', 'tests are')} open to you.`
            : 'No tests are open to you right now.'
          : 'Loading your tests.'}
        {done.length > 0 && ` Across ${plural(done.length, 'attempt')} you answered ${percent(correct, answered)}% of questions correctly.`}
      </p>

      <section aria-labelledby="open-tests" className="mt-10">
        <h2 id="open-tests" className="text-sm font-semibold text-graphite-soft">Open tests</h2>
        {tests.isPending && <Spinner label="Loading tests" />}
        {tests.isError && <ErrorNote message={tests.error.message} />}
        {tests.data && tests.data.length > 0 && (
          <ul className="mt-3 border-t border-rule">
            {tests.data.map((test) => (
              <TestRow key={test._id} test={test} last={lastByTest.get(test._id)} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="results" className="mt-14">
        <h2 id="results" className="text-sm font-semibold text-graphite-soft">Your results</h2>
        {attempts.isPending && <Spinner label="Loading results" />}
        {attempts.isError && <ErrorNote message={attempts.error.message} />}
        {attempts.data && done.length === 0 && (
          <p className="mt-3 border-t border-rule pt-4 text-graphite-soft">Your results will show here after you finish a test.</p>
        )}
        {done.length > 0 && (
          <ul className="mt-3 border-t border-rule">
            {done.map((a, i) => (
              <ResultRow key={a._id ?? i} attempt={a} />
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

function TestRow({ test, last }: { test: TestSummary; last?: Attempt }) {
  const questions = test.totalQuestion || test.questions?.length || 0;
  return (
    <li className="grid gap-x-6 gap-y-3 border-b border-rule py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-form">{test.subjects.map((s) => s.name).join(', ')}</p>
        <h3 className="mt-0.5 text-lg font-bold leading-snug">{test.title}</h3>
        <p className="figures mt-1 text-sm text-graphite-soft">
          {questions ? `${plural(questions, 'question')}, ` : ''}
          {test.totalTime} minutes
          {last && `. Last score ${marks(last.totalMark)} of ${marks(last.maximumMarks)}`}
        </p>
      </div>
      <Link to={`/tests/${test._id}`} className={`${buttonClass(last ? 'secondary' : 'primary')} justify-self-start sm:justify-self-end`}>
        {last ? 'Take again' : 'Start'}
      </Link>
    </li>
  );
}

function ResultRow({ attempt }: { attempt: Attempt }) {
  const score = percent(attempt.totalMark, attempt.maximumMarks);
  return (
    <li className="border-b border-rule">
      <Link
        to={`/results/${attempt._id}`}
        className="grid gap-x-6 gap-y-2 py-4 hover:bg-sheet sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center sm:px-2"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">{attempt.practiceSetInfo?.title ?? 'Test'}</p>
          <p className="text-sm text-graphite-soft">{day(attempt.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-form-faint" aria-hidden="true">
            <span className="block h-full rounded-full bg-graphite" style={{ width: `${Math.max(0, score)}%` }} />
          </span>
          <span className="figures w-16 text-right text-sm font-semibold">
            {marks(attempt.totalMark)} / {marks(attempt.maximumMarks)}
          </span>
        </div>
        <span className="text-sm font-semibold text-form">See answers</span>
      </Link>
    </li>
  );
}
