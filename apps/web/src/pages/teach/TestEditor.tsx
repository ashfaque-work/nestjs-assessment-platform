import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MIN_QUESTIONS_TO_PUBLISH,
  useDeleteTest,
  useDuplicateTest,
  useMoveQuestion,
  usePublishTest,
  useRemoveQuestion,
  useSaveQuestion,
  useSaveTest,
  useTeacherTest,
  useTestQuestions,
  useWithdrawTest,
} from '../../api/teacher';
import type { BankQuestion, TeacherTest } from '../../api/types';
import { Bubble } from '../../components/Bubble';
import { NumberField, TextArea, TextField } from '../../components/fields';
import { Page } from '../../components/Layout';
import { Button, buttonClass, Dialog, ErrorNote, Spinner } from '../../components/ui';
import { letter, marks, plural } from '../../lib/format';
import { draftFrom, QuestionForm } from './QuestionForm';
import { parseEmails } from '../../lib/emails';

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
  const navigate = useNavigate();
  const draft = test.status === 'draft';
  const published = test.status === 'published';
  const [publishing, setPublishing] = useState(false);
  const [confirm, setConfirm] = useState<'withdraw' | 'delete' | null>(null);
  const publish = usePublishTest(test._id);
  const withdraw = useWithdrawTest(test._id);
  const remove = useDeleteTest();
  const duplicate = useDuplicateTest();
  const missing = Math.max(0, MIN_QUESTIONS_TO_PUBLISH - questions.length);
  const actionError = publish.error ?? withdraw.error ?? remove.error ?? duplicate.error;

  // a copy needs its own title: titles are unique
  const copy = () =>
    duplicate.mutate(
      { testId: test._id, title: `${test.title} (copy ${new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })})`.slice(0, 100) },
      { onSuccess: (created) => navigate(`/teach/tests/${created._id}`) },
    );

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
              : published
                ? 'Published. Students can take it, so its questions and marks are locked.'
                : 'Withdrawn. Students can no longer start it; its results stay.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/teach/tests/${test._id}/preview`} className={buttonClass('secondary')}>Preview</Link>
          <Button variant="secondary" onClick={copy} disabled={duplicate.isPending}>{duplicate.isPending ? 'Copying…' : 'Duplicate'}</Button>
          {draft && <Button variant="danger" onClick={() => setConfirm('delete')}>Delete</Button>}
          {published && <Button variant="danger" onClick={() => setConfirm('withdraw')}>Withdraw</Button>}
          {draft ? (
            <Button onClick={() => setPublishing(true)} disabled={missing > 0 || publish.isPending}>Publish</Button>
          ) : (
            <Link to={`/teach/tests/${test._id}/results`} className={buttonClass()}>See results</Link>
          )}
        </div>
      </div>
      {actionError && <ErrorNote message={actionError.message} />}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Questions test={test} questions={questions} locked={!draft} />
        <Settings test={test} mode={draft ? 'draft' : published ? 'published' : 'closed'} />
      </div>

      <Dialog open={confirm === 'withdraw'} onClose={() => setConfirm(null)} title="Withdraw this test?">
        <p className="text-graphite-soft">Students can no longer start it. Attempts already handed in and their results stay.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Keep it open</Button>
          <Button onClick={() => withdraw.mutate(test, { onSettled: () => setConfirm(null) })} disabled={withdraw.isPending}>
            {withdraw.isPending ? 'Withdrawing…' : 'Withdraw'}
          </Button>
        </div>
      </Dialog>
      <Dialog open={confirm === 'delete'} onClose={() => setConfirm(null)} title="Delete this draft?">
        <p className="text-graphite-soft">The draft goes away, with the questions written only for it. Questions other tests use stay.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Keep it</Button>
          <Button onClick={() => remove.mutate(test._id, { onSuccess: () => navigate('/teach', { replace: true }), onSettled: () => setConfirm(null) })} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>

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
  const move = useMoveQuestion(test._id);

  const units = test.units.length ? test.units : [];
  const close = () => { setEditing(null); save.reset(); };

  return (
    <section aria-labelledby="questions">
      <h2 id="questions" className="border-b border-rule pb-2 text-sm font-bold">
        Questions <span className="figures font-normal text-graphite-soft">({questions.length})</span>
      </h2>

      {move.isError && <ErrorNote message={move.error.message} />}
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
                onSave={(d) => save.mutate({ draft: d, test, questionId: q._id }, { onSuccess: close })}
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
              onMove={(by) => move.mutate({ questionId: q._id, order: i + 1 + by })}
              canMoveUp={i > 0 && !move.isPending}
              canMoveDown={i < questions.length - 1 && !move.isPending}
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

function QuestionItem({ number, question, locked, onEdit, onRemove, onMove, canMoveUp, canMoveDown }: {
  number: number; question: BankQuestion; locked: boolean; onEdit: () => void; onRemove: () => void;
  onMove: (by: -1 | 1) => void; canMoveUp: boolean; canMoveDown: boolean;
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
            {[question.topic?.name, question.questionType === 'multiple' ? 'several correct answers' : '', question.answerExplain ? 'has an explanation' : 'no explanation'].filter(Boolean).join('; ')}
          </p>
        </div>
        {!locked && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={onEdit} className="text-sm font-semibold text-graphite hover:underline">Edit</button>
            <button type="button" onClick={onRemove} className="text-sm text-graphite-soft hover:text-wrong">Remove</button>
            <span className="mt-1 flex gap-1">
              <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label={`Move question ${number} up`} className="rounded px-1.5 text-sm text-graphite-soft hover:text-graphite disabled:invisible">↑</button>
              <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label={`Move question ${number} down`} className="rounded px-1.5 text-sm text-graphite-soft hover:text-graphite disabled:invisible">↓</button>
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

// A date input's value (yyyy-mm-dd, local) for a stored date, and back (the end of that day)
const dateValue = (value: string | null | undefined) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
};
const endOfDay = (value: string) => (value ? new Date(`${value}T23:59:59`).toISOString() : null);
const startOfDay = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : null);


// The test's own settings. Marks apply to every question of the test; they are fixed once it is
// published (students may have answered already), and a withdrawn test changes no more.
function Settings({ test, mode }: { test: TeacherTest & Record<string, unknown>; mode: 'draft' | 'published' | 'closed' }) {
  const save = useSaveTest(test._id);
  const locked = mode === 'closed';
  const marksLocked = mode !== 'draft';
  const initial = () => ({
    title: test.title ?? '',
    description: test.description ?? '',
    instructions: test.instructions ?? '',
    totalTime: test.totalTime ?? 30,
    plusMark: test.plusMark ?? 1,
    penalty: Math.abs(test.minusMark ?? 0),
    attempts: test.attemptAllowed ?? 0,
    opens: dateValue(test.opensOn),
    closes: dateValue(test.expiresOn),
    invitedOnly: test.accessMode === 'invitation',
    invitees: (test.inviteeEmails ?? []).join('\n'),
  });
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  // The test reloads whenever a question is saved or removed. Take its new values only if the form
  // has no unsaved edits, so those edits are not thrown away.
  const loaded = useRef(initial());
  useEffect(() => {
    const next = initial();
    setForm((f) => (JSON.stringify(f) === JSON.stringify(loaded.current) ? next : f));
    loaded.current = next;
  }, [test]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(form) !== JSON.stringify(initial());
  const invite = parseEmails(form.invitees);
  const datesOk = !form.opens || !form.closes || form.opens <= form.closes;
  const inviteOk = !form.invitedOnly || (invite.emails.length > 0 && invite.invalid.length === 0);
  const valid = form.title.trim() && form.totalTime >= 1 && form.totalTime <= 600 && form.plusMark > 0 && form.penalty >= 0
    && Number.isInteger(form.attempts) && form.attempts >= 0 && datesOk && inviteOk;
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
          attemptAllowed: form.attempts,
          opensOn: startOfDay(form.opens),
          expiresOn: endOfDay(form.closes),
          accessMode: form.invitedOnly ? 'invitation' : 'public',
          inviteeEmails: form.invitedOnly ? invite.emails : [],
          ...(marksLocked ? {} : { enableMarks: true, isMarksLevel: true, plusMark: form.plusMark, minusMark: -form.penalty }),
        },
      },
      {
        // Show what was stored (trimmed title, the emails in lower case, one per line), so the
        // saved form is not taken for an unsaved edit
        onSuccess: () => {
          setForm((f) => ({ ...f, title: f.title.trim(), invitees: f.invitedOnly ? invite.emails.join('\n') : '' }));
          setSaved(true);
        },
      },
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
          <NumberField label="Right answer" value={form.plusMark} onChange={(v) => set({ plusMark: v })} min={0.25} step={0.25} suffix="marks" disabled={marksLocked} />
          <NumberField label="Wrong answer" value={form.penalty} onChange={(v) => set({ penalty: v })} min={0} step={0.25} suffix="off" disabled={marksLocked} />
        </div>
        <NumberField label="Attempts per student" value={form.attempts} onChange={(v) => set({ attempts: v })} min={0} max={100} suffix="0 = no limit" disabled={locked} />
        <label className="block">
          <span className="text-sm font-semibold">Opens on</span>
          <input type="date" value={form.opens} onChange={(e) => set({ opens: e.target.value })} disabled={locked}
            className="mt-1.5 block h-11 w-full rounded-md border border-rule bg-sheet px-3 text-base outline-none focus:border-graphite disabled:cursor-not-allowed disabled:text-graphite-soft" />
          <span className="mt-1 block text-xs text-graphite-soft">Leave empty to open it as soon as it is published.</span>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Closes after</span>
          <input type="date" value={form.closes} onChange={(e) => set({ closes: e.target.value })} disabled={locked}
            className="mt-1.5 block h-11 w-full rounded-md border border-rule bg-sheet px-3 text-base outline-none focus:border-graphite disabled:cursor-not-allowed disabled:text-graphite-soft" />
          <span className="mt-1 block text-xs text-graphite-soft">Leave empty to keep it open. Students cannot start it after this day.</span>
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Who can take it</legend>
          <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="access" checked={!form.invitedOnly} onChange={() => set({ invitedOnly: false })} disabled={locked} className="accent-[var(--form)]" />
            Every student at the school
          </label>
          <label className="mt-1 flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="access" checked={form.invitedOnly} onChange={() => set({ invitedOnly: true })} disabled={locked} className="accent-[var(--form)]" />
            Only the students I invite
          </label>
          {form.invitedOnly && (
            <div className="mt-2">
              <TextArea label="Their emails" value={form.invitees} onChange={(v) => set({ invitees: v })} rows={3} disabled={locked}
                hint={`One per line or separated by commas. ${plural(invite.emails.length, 'student')} invited.`} />
              {invite.invalid.length > 0 && <p className="mt-1 text-sm text-wrong">Not an email: {invite.invalid.slice(0, 3).join(', ')}</p>}
            </div>
          )}
        </fieldset>
        {!locked && (
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={!dirty || !valid || save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
            {saved && !dirty && <span className="text-sm text-correct">Saved</span>}
          </div>
        )}
        {!valid && !locked && (
          <p className="text-sm text-wrong">
            {!datesOk ? 'It must open before it closes.' : !inviteOk ? (invite.invalid.length ? 'Fix or remove the entries that are not emails.' : 'List the emails of the students you invite.') : 'Give it a title, a time from 1 to 600 minutes, marks above zero, and a whole number of attempts.'}
          </p>
        )}
        {save.isError && <ErrorNote message={save.error.message} />}
        {marksLocked && (
          <p className="text-sm text-graphite-soft">
            {marks(form.plusMark)} marks for a right answer{form.penalty ? `, ${marks(form.penalty)} off for a wrong one` : ''}.
          </p>
        )}
      </div>
    </aside>
  );
}
