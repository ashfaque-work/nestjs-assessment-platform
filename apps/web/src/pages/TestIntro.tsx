import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStartAttempt, useTest } from '../api/hooks';
import { Page } from '../components/Layout';
import { Button, buttonClass, ErrorNote, Spinner } from '../components/ui';
import { clock, marks, plural } from '../lib/format';
import { discardSession, findOpenSession, remainingMs } from '../lib/session';

export function TestIntro() {
  const { testId = '' } = useParams();
  const test = useTest(testId);
  const start = useStartAttempt();
  const navigate = useNavigate();
  const open = findOpenSession(testId, Date.now());

  const begin = () =>
    start.mutate(testId, {
      onSuccess: (attemptId) => {
        // starting over leaves the earlier attempt unfinished; stop offering it
        if (open) discardSession(open.attemptId);
        navigate(`/tests/${testId}/attempt/${attemptId}`);
      },
    });

  if (test.isPending) return <Page><Spinner label="Loading the test" /></Page>;
  if (test.isError) return <Page><ErrorNote message={test.error.message} action={<Link to="/" className={buttonClass('secondary')}>Back to your tests</Link>} /></Page>;

  const t = test.data;
  const count = t.questions.length;
  const plus = t.plusMark ?? 1;
  const minus = Math.abs(t.minusMark ?? 0);

  return (
    <Page>
      <Link to="/" className="text-sm font-semibold text-graphite-soft hover:text-graphite">Your tests</Link>
      <p className="mt-6 text-sm font-semibold text-form">{t.subjects.map((s) => s.name).join(', ')}</p>
      <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight">{t.title}</h1>
      {t.description && <p className="mt-3 max-w-prose font-serif text-lg leading-relaxed text-graphite-soft">{t.description}</p>}

      <dl className="figures mt-8 grid max-w-xl grid-cols-3 border-y border-rule text-sm">
        <Fact term="Questions" value={String(count)} />
        <Fact term="Time" value={`${t.totalTime} min`} />
        <Fact term="Marking" value={t.enableMarks === false ? 'Right or wrong' : minus ? `+${marks(plus)} / −${marks(minus)}` : `+${marks(plus)} each`} />
      </dl>

      <div className="mt-8 max-w-prose space-y-3 font-serif text-[17px] leading-[1.7]">
        {t.instructions && <p>{t.instructions}</p>}
        <p>
          The timer starts when you begin and keeps running if you leave the page. You can move between questions, change
          answers and mark any question to come back to. When the time runs out your answers are submitted as they are.
        </p>
        {minus > 0 && <p>A wrong answer costs {plural(minus, 'mark')}; a question you leave blank costs nothing.</p>}
        {t.testMode === 'proctored' && (
          <p>This is a proctored test. Proctoring watches the student through the camera; this demo does not use the camera.</p>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        {open ? (
          <>
            <Link to={`/tests/${testId}/attempt/${open.attemptId}`} className={buttonClass()}>
              Continue your attempt, {clock(remainingMs(open, Date.now()))} left
            </Link>
            <Button variant="secondary" onClick={begin} disabled={start.isPending}>Start over</Button>
          </>
        ) : (
          <Button onClick={begin} disabled={start.isPending || count === 0}>
            {start.isPending ? 'Starting…' : 'Begin the test'}
          </Button>
        )}
        {count === 0 && <span className="text-sm text-graphite-soft">This test has no questions yet.</span>}
      </div>
      {start.isError && <ErrorNote message={start.error.message} />}
    </Page>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="border-r border-rule py-3 pr-4 last:border-r-0 [&:not(:first-child)]:pl-4">
      <dt className="text-graphite-soft">{term}</dt>
      <dd className="mt-0.5 text-base font-semibold">{value}</dd>
    </div>
  );
}
