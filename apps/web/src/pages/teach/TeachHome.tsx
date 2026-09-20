import { Link } from 'react-router-dom';
import { useTeacherTests } from '../../api/teacher';
import type { TeacherTest } from '../../api/types';
import { useAuth } from '../../auth/auth';
import { Page } from '../../components/Layout';
import { Badge, buttonClass, Card, ErrorNote, Spinner } from '../../components/ui';
import { day, plural } from '../../lib/format';

export function TeachHome() {
  const { user } = useAuth();
  const tests = useTeacherTests();
  const firstName = user?.name?.split(' ')[0];
  const drafts = tests.data?.filter((t) => t.status === 'draft').length ?? 0;
  const live = tests.data?.filter((t) => t.status === 'published').length ?? 0;

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">{firstName ? `Hello, ${firstName}` : 'Your tests'}</h1>
          <p className="mt-2 max-w-prose text-[15px] text-graphite-soft">
            {tests.data
              ? tests.data.length
                ? `You have ${plural(live, 'published test')}${drafts ? ` and ${plural(drafts, 'draft')}` : ''}.`
                : 'You have not written a test yet.'
              : 'Loading your tests.'}
          </p>
        </div>
        <Link to="/teach/new" className={buttonClass()}>
          <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Write a new test
        </Link>
      </div>

      <section aria-labelledby="your-tests" className="mt-10">
        <h2 id="your-tests" className="text-xs font-semibold uppercase tracking-wider text-graphite-soft">Your tests</h2>
        {tests.isPending && <Spinner label="Loading tests" />}
        {tests.isError && <ErrorNote message={tests.error.message} />}
        {tests.data && tests.data.length === 0 && (
          <Card className="mt-3 px-5 py-8 text-center text-sm text-graphite-soft">
            Write a test, add at least five questions, and publish it for your students.
          </Card>
        )}
        {tests.data && tests.data.length > 0 && (
          <ul className="mt-3 grid gap-3">
            {tests.data.map((test) => (
              <TestRow key={test._id} test={test} />
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

const statusTone: Record<string, 'neutral' | 'correct' | 'wrong' | 'review'> = {
  draft: 'neutral',
  published: 'correct',
  revoked: 'wrong',
  expired: 'review',
};
const statusText: Record<string, string> = { draft: 'Draft', published: 'Published', revoked: 'Withdrawn', expired: 'Expired' };

function TestRow({ test }: { test: TeacherTest }) {
  const questions = test.totalQuestion ?? 0;
  const attempts = test.totalAttempt ?? 0;
  return (
    <li>
      <Card className="grid gap-x-6 gap-y-4 p-5 transition-all duration-200 hover:border-rule-strong hover:shadow-pop sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-form">{test.subjects.map((s) => s.name).join(', ')}</span>
            <Badge tone={statusTone[test.status] ?? 'neutral'}>{statusText[test.status] ?? test.status}</Badge>
          </p>
          <h3 className="mt-1.5 text-lg font-bold leading-snug">{test.title}</h3>
          <p className="figures mt-1 text-sm text-graphite-soft">
            {plural(questions, 'question')} · {test.totalTime} min
            {test.status === 'published' ? ` · taken ${plural(attempts, 'time')}` : ''}
            {test.updatedAt ? ` · changed ${day(test.updatedAt)}` : ''}
          </p>
        </div>
        <div className="flex gap-2 sm:justify-self-end">
          {test.status === 'published' && (
            <Link to={`/teach/tests/${test._id}/results`} className={buttonClass('primary')}>Results</Link>
          )}
          <Link to={`/teach/tests/${test._id}`} className={buttonClass(test.status === 'published' ? 'secondary' : 'primary')}>
            {test.status === 'draft' ? 'Edit' : 'Open'}
          </Link>
        </div>
      </Card>
    </li>
  );
}
