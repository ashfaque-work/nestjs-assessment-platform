import { useEffect, useState } from 'react';
import { useAddUser, useAdminUsers, useAllSubjects, useManageUser, useSetUserActive, useUpdateUserRole } from '../../api/admin';
import type { AdminUser } from '../../api/types';
import { isAdmin, useAuth } from '../../auth/auth';
import { Page } from '../../components/Layout';
import { Badge, Button, Card, Dialog, ErrorNote, Spinner } from '../../components/ui';
import { plural } from '../../lib/format';

const ROLE_FILTERS = ['all', 'student', 'teacher', 'admin', 'mentor', 'publisher', 'operator', 'centerHead', 'director', 'support'];
const ASSIGNABLE_ROLES = ['student', 'teacher', 'mentor', 'publisher', 'operator', 'centerHead', 'director', 'support', 'admin'];
const roleLabel = (r: string) => (r === 'centerHead' ? 'centre head' : r);
const PAGE_SIZE = 50;

export function AdminUsers() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  // search once typing pauses, and start again from the first page
  useEffect(() => {
    const t = setTimeout(() => { setSearch(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // The API searches, filters and pages, so this works however many people there are
  const users = useAdminUsers({ page, limit: PAGE_SIZE, role: role === 'all' ? undefined : role, search: search || undefined });
  const filtered = users.data?.users ?? [];
  const total = users.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">People</h1>
          <p className="mt-2 text-[15px] text-graphite-soft">
            {users.data ? `${plural(total, 'account')}${search || role !== 'all' ? ' match' : ' on the platform'}.` : 'Loading accounts.'}
          </p>
        </div>
        {isAdmin(me) && (
          <Button onClick={() => setAdding(true)}>
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Add person
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          className="h-10 w-full rounded-lg border border-rule bg-sheet px-3.5 text-sm outline-none transition-shadow placeholder:text-graphite-soft focus:border-form focus:ring-4 focus:ring-[var(--ring)]/20 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setPage(1); }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                role === r ? 'accent-gradient border-transparent text-white' : 'border-rule bg-sheet text-graphite-soft hover:text-graphite'
              }`}
            >
              {roleLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {users.isPending && <Spinner label="Loading accounts" />}
      {users.isError && <ErrorNote message={users.error.message} />}

      {users.data && (
        <Card className="mt-4 divide-y divide-rule overflow-hidden">
          {filtered.length === 0 && <p className="px-5 py-8 text-center text-sm text-graphite-soft">No one matches that.</p>}
          {filtered.map((u) => (
            <UserRow key={u._id} u={u} isAdminMe={isAdmin(me)} isMe={u._id === me?._id} />
          ))}
        </Card>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
          <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Previous</Button>
          <span className="figures text-graphite-soft">Page {page} of {pages}</span>
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>Next</Button>
        </nav>
      )}

      {adding && <AddPersonDialog onClose={() => setAdding(false)} />}
    </Page>
  );
}

const ROLE_TONE: Record<string, 'accent' | 'neutral' | 'review'> = { admin: 'review', teacher: 'accent', student: 'neutral' };

function UserRow({ u, isAdminMe, isMe }: { u: AdminUser; isAdminMe: boolean; isMe: boolean }) {
  const setActive = useSetUserActive();
  const [editing, setEditing] = useState(false);
  const [editingPerson, setEditingPerson] = useState(false);
  const active = u.isActive !== false;
  const initials = (u.name ?? u.userId ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const canManage = isAdminMe && !isMe;

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span className="accent-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">{initials}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          <span className="truncate">{u.name ?? u.userId}</span>
          {isMe && <span className="text-xs font-normal text-graphite-soft">(you)</span>}
        </p>
        <p className="truncate text-sm text-graphite-soft">{u.email ?? u.userId}</p>
      </div>
      <button
        type="button"
        disabled={!canManage}
        onClick={() => canManage && setEditing(true)}
        className={`hidden flex-wrap justify-end gap-1.5 sm:flex ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
        title={canManage ? 'Change roles' : undefined}
      >
        {(u.roles ?? []).map((r) => (
          <Badge key={r} tone={ROLE_TONE[r] ?? 'neutral'}>{roleLabel(r)}</Badge>
        ))}
      </button>
      {canManage && (
        <Button variant="quiet" className="h-8 px-3 text-xs" onClick={() => setEditingPerson(true)}>Edit</Button>
      )}
      <div className="w-24 shrink-0 text-right">
        {canManage ? (
          <Button
            variant={active ? 'secondary' : 'primary'}
            className="h-8 px-3 text-xs"
            disabled={setActive.isPending}
            onClick={() => setActive.mutate({ id: u._id, isActive: !active })}
          >
            {active ? 'Deactivate' : 'Activate'}
          </Button>
        ) : (
          <Badge tone={active ? 'correct' : 'wrong'}>{active ? 'Active' : 'Inactive'}</Badge>
        )}
      </div>
      {editing && <RoleDialog u={u} onClose={() => setEditing(false)} />}
      {editingPerson && <EditPersonDialog u={u} onClose={() => setEditingPerson(false)} />}
    </div>
  );
}

function RoleDialog({ u, onClose }: { u: AdminUser; onClose: () => void }) {
  const update = useUpdateUserRole();
  const [roles, setRoles] = useState<string[]>(u.roles ?? []);
  const toggle = (r: string) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const save = async () => {
    await update.mutateAsync({ id: u._id, roles });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Roles for ${u.name ?? u.userId}`}>
      <p className="text-sm text-graphite-soft">Pick one or more roles. This replaces their current roles.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {ASSIGNABLE_ROLES.map((r) => (
          <label key={r} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${roles.includes(r) ? 'border-form bg-form-faint text-form' : 'border-rule hover:border-rule-strong'}`}>
            <input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} className="accent-[var(--form)]" />
            {roleLabel(r)}
          </label>
        ))}
      </div>
      {update.isError && <p className="mt-3 text-sm text-wrong">{(update.error as Error).message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={update.isPending || roles.length === 0}>{update.isPending ? 'Saving…' : 'Save roles'}</Button>
      </div>
    </Dialog>
  );
}

// The roles that study or teach subjects: they need at least one to see or write tests
const SUBJECT_ROLES = ['student', 'teacher', 'mentor', 'publisher'];
const TEACHING_ROLES = ['teacher', 'mentor'];

// Choose subjects from the platform's list
function SubjectPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const subjects = useAllSubjects();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Subjects</legend>
      {subjects.isPending && <p className="mt-1.5 text-sm text-graphite-soft">Loading subjects…</p>}
      {subjects.isError && <p className="mt-1.5 text-sm text-wrong">{subjects.error.message}</p>}
      {subjects.data && subjects.data.length === 0 && <p className="mt-1.5 text-sm text-graphite-soft">There are no subjects yet.</p>}
      <div className="mt-1.5 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
        {(subjects.data ?? []).map((s) => (
          <label key={s._id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${value.includes(s._id) ? 'border-form bg-form-faint text-form' : 'border-rule hover:border-rule-strong'}`}>
            <input type="checkbox" checked={value.includes(s._id)} onChange={() => toggle(s._id)} className="accent-[var(--form)]" />
            {s.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function VerifiedToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 accent-[var(--form)]" />
      <span>
        <span className="block text-sm font-semibold">Verified teacher</span>
        <span className="block text-xs text-graphite-soft">A verified teacher can publish tests for every student.</span>
      </span>
    </label>
  );
}

// Change a person's name, subjects, teacher verification and password
function EditPersonDialog({ u, onClose }: { u: AdminUser; onClose: () => void }) {
  const manage = useManageUser();
  const [name, setName] = useState(u.name ?? '');
  const [subjects, setSubjects] = useState<string[]>((u.subjects ?? []).map(String));
  const [verified, setVerified] = useState(!!u.isVerified);
  const [password, setPassword] = useState('');
  const studies = (u.roles ?? []).some((r) => SUBJECT_ROLES.includes(r));
  const teaches = (u.roles ?? []).some((r) => TEACHING_ROLES.includes(r));
  const passwordOk = !password || (password.length >= 8 && password.length <= 20);
  const ready = name.trim().length > 0 && passwordOk;

  const save = async () => {
    await manage.mutateAsync({
      id: u._id,
      name: name.trim(),
      ...(studies ? { subjects } : {}),
      ...(teaches ? { isVerified: verified } : {}),
      ...(password ? { password } : {}),
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Edit ${u.name ?? u.userId}`}>
      <div className="grid gap-4">
        <Field label="Name" value={name} onChange={setName} />
        {studies && <SubjectPicker value={subjects} onChange={setSubjects} />}
        {studies && subjects.length === 0 && (
          <p className="text-xs text-review">Without a subject they cannot {teaches ? 'write tests' : 'see any tests'}.</p>
        )}
        {teaches && <VerifiedToggle checked={verified} onChange={setVerified} />}
        <Field label="New password" type="password" value={password} onChange={setPassword} hint="Leave empty to keep their password. 8 to 20 characters." />
      </div>
      {manage.isError && <p className="mt-3 text-sm text-wrong">{(manage.error as Error).message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!ready || manage.isPending}>{manage.isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </Dialog>
  );
}

function AddPersonDialog({ onClose }: { onClose: () => void }) {
  const add = useAddUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);
  const studies = SUBJECT_ROLES.includes(role);
  const teaches = TEACHING_ROLES.includes(role);

  const submit = async () => {
    await add.mutateAsync({ name, email, password, role, subjects: studies ? subjects : [], verified: teaches && verified });
    onClose();
  };
  const ready = name.trim() && /.+@.+\..+/.test(email) && password.length >= 8 && password.length <= 20;

  return (
    <Dialog open onClose={onClose} title="Add a person">
      <div className="grid gap-3">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} hint="8 to 20 characters" />
        <label className="block">
          <span className="text-sm font-semibold">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1.5 block h-11 w-full rounded-lg border border-rule bg-sheet px-3 text-base capitalize outline-none focus:border-form focus:ring-4 focus:ring-[var(--ring)]/20"
          >
            {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </label>
        {studies && <SubjectPicker value={subjects} onChange={setSubjects} />}
        {teaches && <VerifiedToggle checked={verified} onChange={setVerified} />}
      </div>
      {add.isError && <p className="mt-3 text-sm text-wrong">{(add.error as Error).message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!ready || add.isPending}>{add.isPending ? 'Adding…' : 'Add person'}</Button>
      </div>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = 'text', hint }: { label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block h-11 w-full rounded-lg border border-rule bg-sheet px-3.5 text-base outline-none focus:border-form focus:ring-4 focus:ring-[var(--ring)]/20"
      />
      {hint && <span className="mt-1 block text-xs text-graphite-soft">{hint}</span>}
    </label>
  );
}
