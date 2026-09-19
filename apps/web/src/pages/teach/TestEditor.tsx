import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MIN_QUESTIONS_TO_PUBLISH,
  usePublishTest,
  useRemoveQuestion,
  useSaveQuestion,
  useSaveTest,
  useTeacherTest,
  useTestQuestions,
} from '../../api/teacher';
import type { BankQuestion, TeacherTest } from '../../api/types';
import { Bubble } from '../../components/Bubble';
import { NumberField, TextArea, TextField } from '../../components/fields';
import { Page } from '../../components/Layout';
import { Button, buttonClass, Dialog, ErrorNote, Spinner } from '../../components/ui';
import { letter, marks, plural } from '../../lib/format';
import { draftFrom, QuestionForm } from './QuestionForm';

export function TestEditor() {
  const { testId = '' } = useParams();
  const test = useTeacherTest(testId);
  const questions = useTestQuestions(testId);

  if (test.isPending || questions.isPending) return <Page><Spinner label="Loading the test" /></Page>;
  if (test.isError || questions.isError) {
    const message = (test.error ?? questions.error)?.message ?? 'The test could not be loaded.';
    return <Page><ErrorNote message={message} action={<Link to="/teach" className={buttonClass('secondary')}>Back to your tests</Link>} /></Page>;
  }
  return <Editor test={test.data} questions={questions.data} />;
}

function Editor({ test, questions }: { test: TeacherTest & Record<string, unknown>; questions: BankQuestion[] }) {
  const draft = test.status === 'draft';
  const [publishing, setPublishing] = useState(false);
  const publish = usePublishTest(test._id);
  const missing = Math.max(0, MIN_QUESTIONS_TO_PUBLISH - questions.length);

  return (
    <Page>
      <Link to="/teach" className="text-sm font-semibold text-graphite-soft hover:text-graphite">Your tests</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-form">{test.subjects.map((s) => s.name).join(', ')}</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight">{test.title}</h1>
          <p className="mt-2 text-graphite-soft">
            {draft
              ? missing
                ? `Draft. Add ${plural(missing, 'more question')} to publish it.`
                : 'Draft. Ready to publish when you are.'
              : 'Published. Students can take it, so its questions are locked.'}
          </p>
        </div>
        {draft ? (
          <Button onClick={() => setPublishing(true)} disabled={missing > 0 || publish.isPending}>Publish</Button>
        ) : (
          <Link to={`/teach/tests/${test._id}/results`} className={buttonClass()}>See results</Link>
        )}
      </div>
      {publish.isError && <ErrorNote message={publish.error.message} />}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Questions test={test} questions={questions} locked={!draft} />
        <Settings test={test} locked={!draft} />
      </div>

      <Dialog open={publishing} onClose={() => setPublishing(false)} title="Publish this test?">
        <p className="text-graphite-soft">
          Students can take it as soon as it is published. After that its questions cannot be changed, so every student
          answers the same test.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setPublishing(false)}>Keep editing</Button>
          <Button
            onClick={() => publish.mutate(test, { onSettled: () => setPublishing(false) })}
            disabled={publish.isPending}
          >
            {publish.isPending ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

function Questions({ test, questions, locked }: { test: TeacherTest; questions: BankQuestion[]; locked: boolean }) {
  // 'new', a question id, or null
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<BankQuestion | null>(null);
  const save = useSaveQuestion(test._id);
  const remove = useRemoveQuestion(test._id);

  const units = test.units.length ? test.units : [];
  const close = () => { setEditing(null); save.reset(); };

  return (
    <section aria-labelledby="questions">
      <h2 id="questions" className="border-b border-rule pb-2 text-sm font-bold">
        Questions <span className="figures font-normal text-graphite-soft">({questions.length})</span>
      </h2>

      {questions.length === 0 && editing !== 'new' && (
        <p className="mt-4 text-graphite-soft">No questions yet. A test needs at least {MIN_QUESTIONS_TO_PUBLISH} before you can publish it.</p>
      )}

      <ol className="mt-2">
        {questions.map((q, i) =>
          editing === q._id ? (
            <li key={q._id} className="py-3">
              <QuestionForm
                number={i + 1}
                units={units}
                initial={draftFrom(q, units)}
                saving={save.isPending}
                error={save.error?.message}
                onSave={(d) => save.mutate({ draft: d, test, questionId: q._id, existing: q }, { onSuccess: close })}
                onCancel={close}
              />
            </li>
          ) : (
            <QuestionItem
              key={q._id}
              number={i + 1}
              question={q}
              locked={locked || editing !== null}
              onEdit={() => setEditing(q._id)}
              onRemove={() => setRemoving(q)}
            />
          ),
        )}
      </ol>

      {editing === 'new' ? (
        <div className="mt-4">
          <QuestionForm
            number={questions.length + 1}
            units={units}
            initial={draftFrom(undefined, units)}
            saving={save.isPending}
            error={save.error?.message}
            onSave={(d) => save.mutate({ draft: d, test }, { onSuccess: close })}
            onCancel={close}
          />
        </div>
      ) : (
        !locked && (
          <Button variant="secondary" className="mt-5" onClick={() => setEditing('new')} disabled={editing !== null}>
            Add a question
          </Button>
        )
      )}

      <Dialog open={!!removing} onClose={() => setRemoving(null)} title="Remove this question?">
        <p className="font-serif text-[17px] leading-snug">{removing?.questionText}</p>
        <p className="mt-3 text-sm text-graphite-soft">It is taken out of this test; it stays in your question bank.</p>
        {remove.isError && <ErrorNote message={remove.error.message} />}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoving(null)}>Keep it</Button>
          <Button
            onClick={() => removing && remove.mutate(removing._id, { onSuccess: () => setRemoving(null) })}
            disabled={remove.isPending}
          >
            {remove.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function QuestionItem({ number, question, locked, onEdit, onRemove }: {
  number: number; question: BankQuestion; locked: boolean; onEdit: () => void; onRemove: () => void;
}) {
  return (
    <li className="border-b border-rule py-5">
      <div className="flex gap-4">
        <span className="figures w-6 shrink-0 pt-0.5 text-right text-sm text-form">{number}</span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-line font-serif text-lg leading-snug">{question.questionText}</p>
          <ul className="mt-3 space-y-1.5">
            {question.answers.map((a, i) => (
              <li key={a._id ?? i} className="flex items-center gap-3">
                <Bubble size="sm" label={letter(i)} state={a.isCorrectAnswer ? 'correct' : 'empty'} />
                <span className={`font-serif ${a.isCorrectAnswer ? 'font-semibold' : ''}`}>{a.answerText}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-graphite-soft">
            {[question.topic?.name, question.answerExplain ? 'has an explanation' : 'no explanation'].filter(Boolean).join('; ')}
          </p>
        </div>
        {!locked && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={onEdit} className="text-sm font-semibold text-graphite hover:underline">Edit</button>
            <button type="button" onClick={onRemove} className="text-sm text-graphite-soft hover:text-wrong">Remove</button>
          </div>
        )}
      </div>
    </li>
  );
}

// The test's own settings. Marks apply to every question of the test.
function Settings({ test, locked }: { test: TeacherTest & Record<string, unknown>; locked: boolean }) {
  const save = useSaveTest(test._id);
  const initial = () => ({
    title: test.title ?? '',
    description: test.description ?? '',
    instructions: test.instructions ?? '',
    totalTime: test.totalTime ?? 30,
    plusMark: test.plusMark ?? 1,
    penalty: Math.abs(test.minusMark ?? 0),
  });
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(initial()), [test]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(form) !== JSON.stringify(initial());
  const valid = form.title.trim() && form.totalTime >= 1 && form.totalTime <= 600 && form.plusMark > 0 && form.penalty >= 0;
  const set = (changes: Partial<typeof form>) => { setSaved(false); setForm((f) => ({ ...f, ...changes })); };

  const submit = () =>
    save.mutate(
      {
        test,
        changes: {
          title: form.title.trim(),
          description: form.description,
          instructions: form.instructions,
          totalTime: form.totalTime,
          enableMarks: true,
          isMarksLevel: true,
          plusMark: form.plusMark,
          minusMark: -form.penalty,
        },
      },
      { onSuccess: () => setSaved(true) },
    );

  return (
    <aside aria-labelledby="settings">
      <h2 id="settings" className="border-b border-rule pb-2 text-sm font-bold">About the test</h2>
      <div className="mt-4 space-y-5">
        <TextField label="Title" value={form.title} onChange={(v) => set({ title: v })} maxLength={100} disabled={locked} />
        <TextArea label="Description" value={form.description} onChange={(v) => set({ description: v })} rows={2} disabled={locked} hint="Shown to students before they start." />
        <TextArea label="Instructions" value={form.instructions} onChange={(v) => set({ instructions: v })} rows={3} disabled={locked} />
        <NumberField label="Time" value={form.totalTime} onChange={(v) => set({ totalTime: v })} min={1} max={600} suffix="minutes" disabled={locked} />
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Right answer" value={form.plusMark} onChange={(v) => set({ plusMark: v })} min={0.25} step={0.25} suffix="marks" disabled={locked} />
          <NumberField label="Wrong answer" value={form.penalty} onChange={(v) => set({ penalty: v })} min={0} step={0.25} suffix="off" disabled={locked} />
        </div>
        {!locked && (
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={!dirty || !valid || save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
            {saved && !dirty && <span className="text-sm text-correct">Saved</span>}
          </div>
        )}
        {!valid && !locked && <p className="text-sm text-wrong">Give it a title, a time from 1 to 600 minutes, and marks above zero.</p>}
        {save.isError && <ErrorNote message={save.error.message} />}
        {locked && (
          <p className="text-sm text-graphite-soft">
            {marks(form.plusMark)} marks for a right answer{form.penalty ? `, ${marks(form.penalty)} off for a wrong one` : ''}.
          </p>
        )}
      </div>
    </aside>
  );
}
