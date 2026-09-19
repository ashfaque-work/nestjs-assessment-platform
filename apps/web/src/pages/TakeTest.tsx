import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFinishAttempt, useTest } from '../api/hooks';
import type { Question, TestWithQuestions } from '../api/types';
import { AnswerSheet } from '../components/AnswerSheet';
import { Bubble } from '../components/Bubble';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, buttonClass, Dialog, ErrorNote, Spinner, Wordmark } from '../components/ui';
import { clock, letter, marks, plural } from '../lib/format';
import {
  createSession,
  discardSession,
  loadSession,
  progress,
  remainingMs,
  saveSession,
  sessionReducer,
  toSubmission,
  type Session,
} from '../lib/session';

export function TakeTest() {
  const { testId = '', attemptId = '' } = useParams();
  const test = useTest(testId);

  if (test.isPending) return <Centered><Spinner label="Loading the test" /></Centered>;
  if (test.isError) {
    return (
      <Centered>
        <ErrorNote message={test.error.message} action={<Link to="/" className={buttonClass('secondary')}>Back to your tests</Link>} />
      </Centered>
    );
  }
  return <Attempt test={test.data} attemptId={attemptId} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 sm:px-6">{children}</div>;
}

function Attempt({ test, attemptId }: { test: TestWithQuestions; attemptId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const finish = useFinishAttempt();

  const questions = useMemo(() => new Map(test.questions.map((q) => [q._id, q])), [test.questions]);
  const [session, dispatch] = useReducer(
    sessionReducer,
    null,
    (): Session => loadSession(attemptId) ?? createSession(attemptId, test._id, test.questions.map((q) => q._id), test.totalTime * 60_000, Date.now()),
  );
  useEffect(() => saveSession(session), [session]);

  // Ticks once a second for the clock
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = remainingMs(session, now);

  const [confirming, setConfirming] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const submitted = useRef(false);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    finish.mutate(
      { attemptId, testId: test._id, answers: toSubmission(session, Date.now()), order: session.order },
      {
        onSuccess: () => {
          discardSession(attemptId);
          queryClient.invalidateQueries({ queryKey: ['attempts'] });
          navigate(`/results/${attemptId}`, { replace: true });
        },
        onError: () => {
          // let the student try again; the answers are still saved on this device
          submitted.current = false;
        },
      },
    );
  }, [attemptId, finish, navigate, queryClient, session, test._id]);

  // Out of time: hand in what is there
  useEffect(() => {
    if (left === 0) submit();
  }, [left, submit]);

  const index = session.current;
  const id = session.order[index];
  const question = questions.get(id);
  const go = (i: number) => {
    dispatch({ type: 'goTo', index: i, at: Date.now() });
    setSheetOpen(false);
  };

  // Keyboard: letters or numbers choose an option, arrows move, M marks for review
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirming || sheetOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (!question) return;
      const key = e.key.toLowerCase();
      const option = /^[a-h]$/.test(key) ? key.charCodeAt(0) - 97 : /^[1-8]$/.test(key) ? Number(key) - 1 : -1;
      if (option >= 0 && option < question.answers.length) {
        dispatch({ type: 'choose', questionId: id, optionId: question.answers[option]._id, multiple: question.questionType === 'multiple', at: Date.now() });
      } else if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (key === 'm') dispatch({ type: 'toggleMark', questionId: id });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const p = progress(session);
  const urgency = left < 60_000 ? 'text-wrong' : left < 5 * 60_000 ? 'text-review' : 'text-graphite';
  const last = index === session.order.length - 1;

  return (
    <div className="min-h-dvh pb-24 lg:pb-10">
      <header className="sticky top-0 z-10 border-b border-rule bg-sheet/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <span className="hidden sm:block"><Wordmark /></span>
          <p className="min-w-0 truncate text-sm font-semibold sm:border-l sm:border-rule sm:pl-4">{test.title}</p>
          <div className="ml-auto flex items-center gap-2">
            <span className={`figures text-xl font-bold ${urgency}`} aria-label={`Time left ${clock(left)}`}>
              {clock(left)}
            </span>
            <TimeAnnouncer left={left} />
            <ThemeToggle />
            <Button onClick={() => setConfirming(true)} disabled={finish.isPending}>Submit</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <main>
          {question ? (
            <QuestionView
              question={question}
              number={index + 1}
              total={session.order.length}
              chosen={session.answers[id] ?? []}
              onChoose={(optionId) =>
                dispatch({ type: 'choose', questionId: id, optionId, multiple: question.questionType === 'multiple', at: Date.now() })
              }
              onClear={() => dispatch({ type: 'clear', questionId: id })}
            />
          ) : (
            <ErrorNote message="This question could not be shown." />
          )}

          <nav aria-label="Questions" className="mt-10 flex flex-wrap items-center gap-2 border-t border-rule pt-5">
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>Previous</Button>
            <Button
              variant="quiet"
              aria-pressed={!!session.marked[id]}
              onClick={() => dispatch({ type: 'toggleMark', questionId: id })}
              className={session.marked[id] ? 'text-review hover:text-review' : ''}
            >
              {session.marked[id] ? 'Marked for review' : 'Mark for review'}
            </Button>
            <span className="ml-auto" />
            {last ? (
              <Button onClick={() => setConfirming(true)}>Review and submit</Button>
            ) : (
              <Button onClick={() => go(index + 1)}>Next</Button>
            )}
          </nav>
          <p className="mt-4 hidden text-xs text-graphite-soft sm:block">
            Keys: A–D to answer, arrows to move, M to mark for review.
          </p>
          {finish.isError && <ErrorNote message={`Your answers were not submitted: ${finish.error.message} They are saved here; submit again.`} />}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-22">
            <AnswerSheet questions={questions} session={session} onGo={go} />
          </div>
        </aside>
      </div>

      {/* On small screens the answer sheet opens from the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-sheet px-4 py-3 lg:hidden">
        <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
          Answer sheet, {p.answered} of {p.total} answered
        </Button>
      </div>
      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title={test.title}>
        <AnswerSheet questions={questions} session={session} onGo={go} />
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setSheetOpen(false)}>Close</Button>
      </Dialog>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Submit your answers?">
        <p className="text-graphite-soft">
          You answered {p.answered} of {plural(p.total, 'question')}
          {p.marked ? ` and marked ${p.marked} for review` : ''}. You cannot change answers after submitting.
        </p>
        {p.unanswered > 0 && (
          <p className="mt-2 text-sm text-review">
            {plural(p.unanswered, 'question')} {p.unanswered === 1 ? 'has' : 'have'} no answer.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)}>Keep working</Button>
          <Button onClick={() => { setConfirming(false); submit(); }} disabled={finish.isPending}>
            {finish.isPending ? 'Submitting…' : 'Submit answers'}
          </Button>
        </div>
      </Dialog>

      {finish.isPending && (
        <div role="status" className="fixed inset-0 z-20 grid place-items-center bg-paper/80">
          <Spinner label={left === 0 ? 'Time is up. Submitting your answers' : 'Submitting your answers'} />
        </div>
      )}
    </div>
  );
}

function QuestionView({ question, number, total, chosen, onChoose, onClear }: {
  question: Question;
  number: number;
  total: number;
  chosen: string[];
  onChoose: (optionId: string) => void;
  onClear: () => void;
}) {
  const multiple = question.questionType === 'multiple';
  const plus = question.plusMark ?? 1;
  const minus = Math.abs(question.minusMark ?? 0);
  return (
    <section aria-labelledby="question-text">
      <p className="figures flex flex-wrap gap-x-4 text-sm text-graphite-soft">
        <span className="font-semibold text-graphite">Question {number} of {total}</span>
        <span>{minus ? `+${marks(plus)} / −${marks(minus)}` : `${plural(plus, 'mark')}`}</span>
        {question.topic?.name && <span>{question.topic.name}</span>}
      </p>

      {question.questionHeader && (
        <p className="mt-4 max-w-prose whitespace-pre-line font-serif text-[17px] leading-[1.7] text-graphite-soft">{question.questionHeader}</p>
      )}
      <h1 id="question-text" className="mt-4 max-w-prose whitespace-pre-line font-serif text-[22px] leading-[1.55]">
        {question.questionText}
      </h1>
      {multiple && <p className="mt-2 text-sm text-graphite-soft">Choose every answer that applies.</p>}

      <div role={multiple ? 'group' : 'radiogroup'} aria-labelledby="question-text" className="mt-7 max-w-prose space-y-2.5">
        {question.answers.map((a, i) => {
          const selected = chosen.includes(a._id);
          return (
            <label
              key={a._id}
              className={`flex cursor-pointer items-center gap-4 rounded-md border bg-sheet px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-form ${
                selected ? 'border-graphite' : 'border-rule hover:border-graphite-soft'
              }`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`q-${question._id}`}
                checked={selected}
                onChange={() => onChoose(a._id)}
                className="sr-only"
              />
              <Bubble label={letter(i)} state={selected ? 'filled' : 'empty'} />
              <span className="font-serif text-[17px] leading-snug">{a.answerText}</span>
            </label>
          );
        })}
      </div>
      {chosen.length > 0 && (
        <button type="button" onClick={onClear} className="mt-3 text-sm font-semibold text-graphite-soft hover:text-graphite">
          Clear answer
        </button>
      )}
    </section>
  );
}

// Tells screen reader users about the time once, at five minutes and at one minute left
function TimeAnnouncer({ left }: { left: number }) {
  const message = left <= 60_000 && left > 55_000 ? 'One minute left' : left <= 300_000 && left > 295_000 ? 'Five minutes left' : '';
  return (
    <span className="sr-only" aria-live="assertive">
      {message}
    </span>
  );
}
