import type { Question } from '../api/types';
import { letter } from '../lib/format';
import { isAnswered, progress, type Session } from '../lib/session';
import { Bubble } from './Bubble';

// The student's answer sheet: one row per question with its bubbles as filled in so far.
// It doubles as the navigator; choosing a row opens that question.
export function AnswerSheet({ questions, session, onGo }: { questions: Map<string, Question>; session: Session; onGo: (index: number) => void }) {
  const p = progress(session);
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-form/40 pb-2 text-form">
        <h2 className="text-sm font-bold">Answer sheet</h2>
        <span className="figures text-xs">
          {p.answered} of {p.total} answered
        </span>
      </div>

      <ol className="mt-2 space-y-0.5">
        {session.order.map((id, index) => {
          const q = questions.get(id);
          const chosen = session.answers[id] ?? [];
          const current = index === session.current;
          const marked = !!session.marked[id];
          const state = isAnswered(session, id) ? 'answered' : 'not answered';
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onGo(index)}
                aria-current={current ? 'step' : undefined}
                aria-label={`Question ${index + 1}, ${state}${marked ? ', marked for review' : ''}`}
                className={`relative flex w-full items-center gap-2.5 rounded-sm py-1.5 pl-2 pr-2 text-left transition-colors ${
                  current ? 'bg-form-faint' : 'hover:bg-rule/50'
                }`}
              >
                {current && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-form" aria-hidden="true" />}
                <span className={`figures w-5 text-right text-xs ${current ? 'font-bold text-graphite' : 'text-form'}`}>{index + 1}</span>
                <span className="flex gap-1.5">
                  {(q?.answers ?? []).map((a, i) => (
                    <Bubble key={a._id} size="sm" label={letter(i)} state={chosen.includes(a._id) ? 'filled' : 'empty'} />
                  ))}
                </span>
                {marked && (
                  <span className="ml-auto text-xs font-semibold text-review" aria-hidden="true">
                    Review
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-rule pt-3 text-xs leading-relaxed text-graphite-soft">
        {p.marked > 0 && `${p.marked} marked for review. `}
        {p.unanswered > 0 ? `${p.unanswered} not answered yet.` : 'Every question has an answer.'}
      </p>
    </div>
  );
}
