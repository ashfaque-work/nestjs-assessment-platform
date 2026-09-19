import { Link, useParams } from 'react-router-dom';
import { useAttempt, useReview } from '../api/hooks';
import { STATUS, type GradedAnswer, type ReviewQuestion, type SubjectScore } from '../api/types';
import { Bubble, type BubbleState } from '../components/Bubble';
import { Page } from '../components/Layout';
import { buttonClass, ErrorNote, Spinner } from '../components/ui';
import { day, duration, letter, marks, percent, plural } from '../lib/format';

const idOf = (q: GradedAnswer['question']) => (typeof q === 'string' ? q : q._id);

export function Result() {
  const { attemptId = '' } = useParams();
  const attempt = useAttempt(attemptId);
  const review = useReview(attemptId, attempt.isSuccess);

  if (attempt.isPending) return <Page><Spinner label="Loading your result" /></Page>;
  if (attempt.isError) {
    return <Page><ErrorNote message={attempt.error.message} action={<Link to="/" className={buttonClass('secondary')}>Back to your tests</Link>} /></Page>;
  }
  const a = attempt.data;

  return (
    <Page>
      <Link to="/" className="text-sm font-semibold text-graphite-soft hover:text-graphite">Your tests</Link>
      <p className="mt-6 text-sm font-semibold text-form">
        {a.practiceSetInfo?.title ?? 'Test'}, {day(a.createdAt)}
      </p>
      <h1 className="figures mt-1 text-[40px] font-bold leading-tight tracking-tight">
        You scored {marks(a.totalMark)} of {marks(a.maximumMarks)}.
      </h1>
      <p className="figures mt-2 max-w-prose text-graphite-soft">
        {plural(a.totalCorrects, 'answer')} right, {a.totalErrors} wrong, {a.totalMissed} not answered, in {duration(a.totalTime)}.
        {a.isEvaluated === false && ' Some answers are waiting for a teacher to mark them.'}
      </p>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="graded-sheet">
          <div className="flex items-baseline justify-between border-b border-form/40 pb-2">
            <h2 id="graded-sheet" className="text-sm font-bold text-form">Your answer sheet, marked</h2>
            <Legend />
          </div>
          {review.isPending && <Spinner label="Loading the answers" />}
          {review.isError && (
            <p className="mt-4 text-sm text-graphite-soft">The correct answers are not shown for this test.</p>
          )}
          <ol className="mt-1">
            {(a.QA ?? []).map((qa, i) => (
              <GradedRow key={idOf(qa.question)} number={i + 1} qa={qa} question={review.data?.find((q) => q._id === idOf(qa.question))} />
            ))}
          </ol>
        </section>

        <aside aria-labelledby="by-topic">
          <h2 id="by-topic" className="border-b border-rule pb-2 text-sm font-bold">By topic</h2>
          <Breakdown subjects={a.subjects} />
          <div className="mt-10 flex flex-col gap-2">
            <Link to={`/tests/${a.practicesetId}`} className={buttonClass()}>Take the test again</Link>
            <Link to="/" className={buttonClass('secondary')}>Back to your tests</Link>
          </div>
        </aside>
      </div>
    </Page>
  );
}

function Legend() {
  return (
    <span className="hidden items-center gap-3 text-xs text-graphite-soft sm:flex">
      <span className="flex items-center gap-1.5"><Bubble size="sm" label="" state="correct" /> Right</span>
      <span className="flex items-center gap-1.5"><Bubble size="sm" label="" state="wrong" /> Wrong</span>
      <span className="flex items-center gap-1.5"><Bubble size="sm" label="" state="key" /> Answer</span>
    </span>
  );
}

function bubbleFor(chosen: boolean, correct: boolean | undefined): BubbleState {
  if (chosen) return correct ? 'correct' : 'wrong';
  return correct ? 'key' : 'empty';
}

const verdict: Record<number, { text: string; className: string }> = {
  [STATUS.CORRECT]: { text: 'Right', className: 'text-correct' },
  [STATUS.INCORRECT]: { text: 'Wrong', className: 'text-wrong' },
  [STATUS.PENDING]: { text: 'Being marked', className: 'text-review' },
};

function GradedRow({ number, qa, question }: { number: number; qa: GradedAnswer; question?: ReviewQuestion }) {
  const chosen = new Set(qa.answers.map((x) => x.answerId));
  const v = verdict[qa.status] ?? { text: 'Not answered', className: 'text-graphite-soft' };
  const signed = qa.obtainMarks > 0 ? `+${marks(qa.obtainMarks)}` : qa.obtainMarks < 0 ? `−${marks(-qa.obtainMarks)}` : '0';

  return (
    <li className="border-b border-rule">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 py-3 pl-1 pr-1 hover:bg-sheet [&::-webkit-details-marker]:hidden">
          <span className="figures w-6 text-right text-xs text-form">{number}</span>
          <span className="flex gap-1.5">
            {(question?.answers ?? []).map((ans, i) => (
              <Bubble key={ans._id} size="sm" label={letter(i)} state={bubbleFor(chosen.has(ans._id), ans.isCorrectAnswer)} />
            ))}
          </span>
          <span className={`ml-2 text-sm font-semibold ${v.className}`}>{v.text}</span>
          {qa.hasMarked && <span className="text-xs text-review">Marked for review</span>}
          <span className="figures ml-auto text-sm font-semibold">{signed}</span>
          <span className="text-graphite-soft transition-transform group-open:rotate-90" aria-hidden="true">›</span>
        </summary>

        {question && (
          <div className="pb-6 pl-10 pr-2 pt-1">
            <p className="max-w-prose whitespace-pre-line font-serif text-lg leading-[1.6]">{question.questionText}</p>
            <ul className="mt-4 max-w-prose space-y-2">
              {question.answers.map((ans, i) => {
                const mine = chosen.has(ans._id);
                return (
                  <li key={ans._id} className="flex items-center gap-3">
                    <Bubble size="md" label={letter(i)} state={bubbleFor(mine, ans.isCorrectAnswer)} />
                    <span className="font-serif text-[17px]">{ans.answerText}</span>
                    {(mine || ans.isCorrectAnswer) && (
                      <span className="text-xs text-graphite-soft">
                        {mine && ans.isCorrectAnswer ? 'Your answer, correct' : mine ? 'Your answer' : 'Correct answer'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {question.answerExplain && (
              <div className="mt-5 max-w-prose border-l-2 border-form/50 pl-4">
                <p className="text-sm font-semibold">Why</p>
                <p className="mt-1 whitespace-pre-line font-serif text-[17px] leading-[1.65] text-graphite-soft">{question.answerExplain}</p>
              </div>
            )}
            <p className="figures mt-4 text-xs text-graphite-soft">{duration(qa.timeEslapse)} on this question</p>
          </div>
        )}
      </details>
    </li>
  );
}

function Breakdown({ subjects }: { subjects: SubjectScore[] }) {
  const topics = subjects.flatMap((s) => s.units.flatMap((u) => u.topics.map((t) => ({ ...t, subject: s.name }))));
  if (!topics.length) return <p className="mt-3 text-sm text-graphite-soft">No topic details for this attempt.</p>;
  return (
    <ul className="mt-2">
      {topics.map((t) => {
        const total = t.correct + t.incorrect + t.missed + t.pending;
        return (
          <li key={t._id} className="border-b border-rule py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold leading-snug">{t.name}</span>
              <span className="figures shrink-0 text-sm text-graphite-soft">
                {t.correct} of {total}
              </span>
            </div>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-form-faint" aria-hidden="true">
              <span className="block h-full rounded-full bg-graphite" style={{ width: `${percent(t.correct, total)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

