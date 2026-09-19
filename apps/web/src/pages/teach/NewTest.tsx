import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateTest, useMySubjects, useUnits } from '../../api/teacher';
import { SelectField, TextField } from '../../components/fields';
import { Page } from '../../components/Layout';
import { Button, ErrorNote, Spinner } from '../../components/ui';

export function NewTest() {
  const navigate = useNavigate();
  const subjects = useMySubjects();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const units = useUnits(subjectId || undefined);
  const create = useCreateTest();

  const subject = subjects.data?.find((s) => s._id === subjectId);
  const unit = units.data?.find((u) => u._id === unitId);
  const ready = title.trim().length > 0 && !!subject && !!unit;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!subject || !unit) return;
    create.mutate(
      { title: title.trim(), subject: { _id: subject._id, name: subject.name }, unit: { _id: unit._id, name: unit.unitName } },
      { onSuccess: (test) => navigate(`/teach/tests/${test._id}`, { replace: true }) },
    );
  };

  return (
    <Page>
      <Link to="/teach" className="text-sm font-semibold text-graphite-soft hover:text-graphite">Your tests</Link>
      <h1 className="mt-6 text-[32px] font-bold leading-tight tracking-tight">Write a new test</h1>
      <p className="mt-2 max-w-prose text-graphite-soft">
        Name it and choose what it covers. You add the questions and set the time next; students see it only after you publish.
      </p>

      {subjects.isPending ? (
        <Spinner label="Loading your subjects" />
      ) : subjects.isError ? (
        <ErrorNote message={subjects.error.message} />
      ) : (
        <form onSubmit={submit} className="mt-8 max-w-md space-y-5">
          <TextField label="Title" value={title} onChange={setTitle} maxLength={100} placeholder="Linear equations, week 3" />
          <SelectField
            label="Subject"
            value={subjectId}
            onChange={(v) => { setSubjectId(v); setUnitId(''); }}
            placeholder="Choose a subject"
            options={(subjects.data ?? []).map((s) => ({ value: s._id, label: s.name }))}
          />
          <SelectField
            label="Unit"
            value={unitId}
            onChange={setUnitId}
            placeholder={subjectId ? (units.isPending ? 'Loading units…' : 'Choose a unit') : 'Choose a subject first'}
            disabled={!subjectId || units.isPending}
            options={(units.data ?? []).map((u) => ({ value: u._id, label: u.unitName }))}
          />
          <Button type="submit" disabled={!ready || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create the test'}
          </Button>
          {create.isError && <ErrorNote message={create.error.message} />}
        </form>
      )}
    </Page>
  );
}
