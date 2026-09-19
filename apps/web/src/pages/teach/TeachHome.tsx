import { Link } from 'react-router-dom';
import { useTeacherTests } from '../../api/teacher';
import type { TeacherTest } from '../../api/types';
import { useAuth } from '../../auth/auth';
import { Page } from '../../components/Layout';
import { buttonClass, ErrorNote, Spinner } from '../../components/ui';
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
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">{firstName ? `Hello, ${firstName}` : 'Your tests'}</h1>
          <p className="mt-2 max-w-prose text-graphite-soft">
            {tests.data
              ? tests.data.length
                ? `You have ${plural(live, 'published test')}${drafts ? ` and ${plural(drafts, 'draft')}` : ''}.`
                : 'You have not written a test yet.'
              : 'Loading your tests.'}
          </p>
        </div>
        <Link to="/teach/new" className={buttonClass()}>Write a new test</Link>
      </div>

      <section aria-labelledby="your-tests" className="mt-10">
        <h2 id="your-tests" className="text-sm font-semibold text-graphite-soft">Your tests</h2>
        {tests.isPending && <Spinner label="Loading tests" />}
        {tests.isError && <ErrorNote message={tests.error.message} />}
        {tests.data && tests.data.length === 0 && (
          <p className="mt-3 border-t border-rule pt-4 text-graphite-soft">
            Write a test, add at least five questions, and publish it for your students.
          </p>
        )}
        {tests.data && tests.data.length > 0 && (
          <ul className="mt-3 border-t border-rule">
            {tests.data.map((test) => (
              <TestRow key={test._id} test={test} />
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

const statusLabel: Record<string, { text: string; className: string }> = {
  draft: { text: 'Draft', className: 'border-rule text-graphite-soft' },
  published: { text: 'Published', className: 'border-correct/50 text-correct' },
  revoked: { text: 'Withdrawn', className: 'border-wrong/50 text-wrong' },
  expired: { text: 'Expired', className: 'border-review/50 text-review' },
};

function TestRow({ test }: { test: TeacherTest }) {
  const status = statusLabel[test.status] ?? { text: test.status, className: 'border-rule text-graphite-soft' };
  const questions = test.totalQuestion ?? 0;
  const attempts = test.totalAttempt ?? 0;
  return (
    <li className="grid gap-x-6 gap-y-3 border-b border-rule py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-form">{test.subjects.map((s) => s.name).join(', ')}</span>
          <span className={`rounded-full border px-2 py-px text-xs font-semibold ${status.className}`}>{status.text}</span>
        </p>
        <h3 className="mt-1 text-lg font-bold leading-snug">{test.title}</h3>
        <p className="figures mt-1 text-sm text-graphite-soft">
          {plural(questions, 'question')}, {test.totalTime} minutes
          {test.status === 'published' ? `, taken ${plural(attempts, 'time')}` : ''}
          {test.updatedAt ? `. Changed ${day(test.updatedAt)}` : ''}
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
    </li>
  );
}
