import { useState } from 'react';
import { draftProblems } from '../../api/teacher';
import type { BankQuestion, NamedRef, QuestionDraft } from '../../api/types';
import { useTopics } from '../../api/teacher';
import { Bubble } from '../../components/Bubble';
import { SelectField, TextArea } from '../../components/fields';
import { Button, ErrorNote } from '../../components/ui';
import { letter } from '../../lib/format';

const MAX_OPTIONS = 6;

export function draftFrom(question: BankQuestion | undefined, units: NamedRef[]): QuestionDraft {
  if (!question) {
    return {
      questionText: '',
      unit: units.length === 1 ? units[0] : null,
      topic: null,
      options: [0, 1, 2, 3].map(() => ({ answerText: '', isCorrectAnswer: false })),
      answerExplain: '',
    };
  }
  return {
    questionText: question.questionText ?? '',
    unit: question.unit ?? null,
    topic: question.topic ?? null,
    options: question.answers.map((a) => ({ answerText: a.answerText ?? '', isCorrectAnswer: !!a.isCorrectAnswer })),
    answerExplain: question.answerExplain ?? '',
  };
}

export function QuestionForm({ number, units, initial, saving, error, onSave, onCancel }: {
  number: number;
  units: NamedRef[];
  initial: QuestionDraft;
  saving: boolean;
  error?: string;
  onSave: (draft: QuestionDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [tried, setTried] = useState(false);
  const topics = useTopics(draft.unit?._id);
  const problems = draftProblems(draft);

  const set = (changes: Partial<QuestionDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const setOption = (i: number, changes: Partial<QuestionDraft['options'][number]>) =>
    set({ options: draft.options.map((o, j) => (j === i ? { ...o, ...changes } : o)) });
  const markCorrect = (i: number) => set({ options: draft.options.map((o, j) => ({ ...o, isCorrectAnswer: j === i })) });

  const save = () => {
    setTried(true);
    if (problems.length === 0) onSave(draft);
  };

  return (
    <div className="rounded-lg border border-graphite/30 bg-sheet p-5 sm:p-6">
      <p className="text-sm font-semibold">Question {number}</p>

      <div className="mt-4 space-y-5">
        <TextArea label="Question" value={draft.questionText} onChange={(v) => set({ questionText: v })} rows={3} serif placeholder="Solve for x: 5x = 35" />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Unit"
            value={draft.unit?._id ?? ''}
            onChange={(id) => set({ unit: units.find((u) => u._id === id) ?? null, topic: null })}
            placeholder="Choose a unit"
            options={units.map((u) => ({ value: u._id, label: u.name }))}
          />
          <SelectField
            label="Topic"
            value={draft.topic?._id ?? ''}
            onChange={(id) => {
              const t = topics.data?.find((x) => x._id === id);
              set({ topic: t ? { _id: t._id, name: t.topicName } : null });
            }}
            placeholder={draft.unit ? (topics.isPending ? 'Loading topics…' : 'Choose a topic') : 'Choose a unit first'}
            disabled={!draft.unit || topics.isPending}
            options={(topics.data ?? []).map((t) => ({ value: t._id, label: t.topicName }))}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Answer options</legend>
          <p className="mt-1 text-xs text-graphite-soft">Fill the bubble of the correct answer.</p>
          <ol className="mt-3 space-y-2">
            {draft.options.map((o, i) => (
              <li key={i} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => markCorrect(i)}
                  aria-pressed={o.isCorrectAnswer}
                  aria-label={`Option ${letter(i)} is the correct answer`}
                  className="rounded-full"
                >
                  <Bubble label={letter(i)} state={o.isCorrectAnswer ? 'correct' : 'empty'} />
                </button>
                <input
                  value={o.answerText}
                  onChange={(e) => setOption(i, { answerText: e.target.value })}
                  aria-label={`Option ${letter(i)}`}
                  className="h-11 min-w-0 flex-1 rounded-md border border-rule bg-paper px-3 font-serif text-[17px] outline-none focus:border-graphite"
                />
                <button
                  type="button"
                  onClick={() => set({ options: draft.options.filter((_, j) => j !== i) })}
                  disabled={draft.options.length <= 2}
                  className="shrink-0 px-2 text-sm text-graphite-soft hover:text-wrong disabled:invisible"
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
          {draft.options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => set({ options: [...draft.options, { answerText: '', isCorrectAnswer: false }] })}
              className="mt-3 text-sm font-semibold text-form hover:underline"
            >
              Add an option
            </button>
          )}
        </fieldset>

        <TextArea
          label="Explanation"
          hint="Optional. Students see it next to the answer after they finish."
          value={draft.answerExplain}
          onChange={(v) => set({ answerExplain: v })}
          rows={2}
          serif
        />
      </div>

      {tried && problems.length > 0 && (
        <ul role="alert" className="mt-5 space-y-1 text-sm text-wrong">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {error && <ErrorNote message={error} />}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save question'}</Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}
