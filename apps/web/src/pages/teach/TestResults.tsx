import { Link, useParams } from 'react-router-dom';
import { useTeacherTest, useTestQuestions, useTestResults } from '../../api/teacher';
import type { BankQuestion } from '../../api/types';
import { Bubble, type BubbleState } from '../../components/Bubble';
import { Page } from '../../components/Layout';
import { buttonClass, ErrorNote, Spinner } from '../../components/ui';
import { day, duration, letter, marks, percent, plural } from '../../lib/format';
import { classResults, type Cell } from '../../lib/results';

const cellStyle: Record<Cell, { state: BubbleState; label: string }> = {
  right: { state: 'correct', label: 'right' },
  wrong: { state: 'wrong', label: 'wrong' },
  missed: { state: 'empty', label: 'not answered' },
  pending: { state: 'key', label: 'being marked' },
};

export function TestResults() {
  const { testId = '' } = useParams();
  const test = useTeacherTest(testId);
  const questions = useTestQuestions(testId);
  const attempts = useTestResults(testId);

  if (test.isPending || questions.isPending || attempts.isPending) return <Page><Spinner label="Loading the results" /></Page>;
  const error = test.error ?? questions.error ?? attempts.error;
  if (error) {
    return <Page><ErrorNote message={error.message} action={<Link to="/teach" className={buttonClass('secondary')}>Back to your tests</Link>} /></Page>;
  }

  const qs = questions.data ?? [];
  const r = classResults(attempts.data ?? [], qs.map((q) => q._id));
  const students = new Set(r.rows.map((row) => row.name)).size;

  return (
    <Page>
      <Link to="/teach" className="text-sm font-semibold text-graphite-soft hover:text-graphite">Your tests</Link>
      <p className="mt-6 text-sm font-semibold text-form">{test.data?.subjects.map((s) => s.name).join(', ')}</p>
      <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight">{test.data?.title}</h1>

      {r.rows.length === 0 ? (
        <p className="mt-3 max-w-prose text-graphite-soft">
          No one has finished this test yet. Results appear here as soon as a student hands it in.
        </p>
      ) : (
        <p className="figures mt-3 max-w-prose text-graphite-soft">
          {plural(students, 'student')} handed it in{r.rows.length > students ? `, ${plural(r.rows.length, 'attempt')} in all` : ''}. The average score is{' '}
          {marks(Math.round(r.averageScore * 10) / 10)} of {marks(r.maxScore)}.
          {r.hardest !== null && ` Question ${r.hardest + 1} was the hardest: ${percent(r.perQuestion[r.hardest].right, r.perQuestion[r.hardest].total)}% got it right.`}
        </p>
      )}

      {r.rows.length > 0 && (
        <section aria-labelledby="class-sheet" className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-form/40 pb-2">
            <h2 id="class-sheet" className="text-sm font-bold text-form">Class answer sheet</h2>
            <span className="flex items-center gap-3 text-xs text-graphite-soft">
              <span className="flex items-center gap-1.5"><Bubble size="sm" label="" state="correct" /> Right</span>
              <span className="flex items-center gap-1.5"><Bubble size="sm" label="" state="wrong" /> Wrong</span>
              <span className="flex items-center gap-1.5"><Bubble size="sm" label="" state="empty" /> Not answered</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="figures mt-2 w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-graphite-soft">
                  <th scope="col" className="py-2 pr-6 font-semibold">Student</th>
                  {qs.map((q, i) => (
                    <th key={q._id} scope="col" className={`w-11 py-2 text-center font-semibold ${i === r.hardest ? 'text-form' : ''}`} title={q.questionText}>
                      {i + 1}
                    </th>
                  ))}
                  <th scope="col" className="py-2 pl-6 text-right font-semibold">Score</th>
                  <th scope="col" className="hidden py-2 pl-6 text-right font-semibold sm:table-cell">Time</th>
                  <th scope="col" className="hidden py-2 pl-6 text-right font-semibold md:table-cell">Handed in</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((row) => (
                  <tr key={row.id} className="border-t border-rule">
                    <th scope="row" className="py-2.5 pr-6 text-left font-semibold">
                      {row.name}
                      {row.attemptNumber > 1 && <span className="ml-1.5 font-normal text-graphite-soft">attempt {row.attemptNumber}</span>}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="py-2.5 text-center">
                        <span className="inline-flex" role="img" aria-label={`Question ${i + 1}: ${cellStyle[cell].label}`}>
                          <Bubble size="sm" label="" state={cellStyle[cell].state} />
                        </span>
                      </td>
                    ))}
                    <td className="py-2.5 pl-6 text-right font-semibold">{marks(row.score)} / {marks(row.maxScore)}</td>
                    <td className="hidden py-2.5 pl-6 text-right text-graphite-soft sm:table-cell">{duration(row.timeMs)}</td>
                    <td className="hidden py-2.5 pl-6 text-right text-graphite-soft md:table-cell">{day(row.date)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-form/40 text-xs">
                  <th scope="row" className="py-2.5 pr-6 text-left font-semibold text-graphite-soft">Got it right, %</th>
                  {r.perQuestion.map((p, i) => (
                    <td key={i} className={`py-2.5 text-center font-semibold ${i === r.hardest ? 'text-form' : ''}`}>
                      {percent(p.right, p.total)}
                    </td>
                  ))}
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="the-questions" className="mt-14">
        <h2 id="the-questions" className="border-b border-rule pb-2 text-sm font-bold">The questions</h2>
        <ol>
          {qs.map((q, i) => (
            <QuestionRow key={q._id} number={i + 1} question={q} right={r.perQuestion[i]} hardest={i === r.hardest} />
          ))}
        </ol>
      </section>
    </Page>
  );
}

function QuestionRow({ number, question, right, hardest }: { number: number; question: BankQuestion; right?: { right: number; total: number }; hardest: boolean }) {
  const correct = question.answers.findIndex((a) => a.isCorrectAnswer);
  return (
    <li className="flex gap-4 border-b border-rule py-4">
      <span className={`figures w-6 shrink-0 pt-0.5 text-right text-sm ${hardest ? 'font-bold text-form' : 'text-form'}`}>{number}</span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[17px] leading-snug">{question.questionText}</p>
        <p className="mt-1 text-sm text-graphite-soft">
          Answer: {correct >= 0 ? `${letter(correct)} (${question.answers[correct].answerText})` : 'not set'}
          {right && right.total > 0 && `. ${right.right} of ${right.total} got it right`}
          {hardest && ', the hardest in this test'}
        </p>
      </div>
    </li>
  );
}
