import { useMemo, useState } from 'react';
import { useAddUser, useAdminUsers, useSetUserActive, useUpdateUserRole } from '../../api/admin';
import type { AdminUser } from '../../api/types';
import { isAdmin, useAuth } from '../../auth/auth';
import { Page } from '../../components/Layout';
import { Badge, Button, Card, Dialog, ErrorNote, Spinner } from '../../components/ui';
import { plural } from '../../lib/format';

const ROLE_FILTERS = ['all', 'student', 'teacher', 'admin', 'mentor', 'publisher', 'operator', 'centerHead', 'director', 'support'];
const ASSIGNABLE_ROLES = ['student', 'teacher', 'mentor', 'publisher', 'operator', 'centerHead', 'director', 'support', 'admin'];
const roleLabel = (r: string) => (r === 'centerHead' ? 'centre head' : r);

export function AdminUsers() {
  const { user: me } = useAuth();
  const users = useAdminUsers();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      if (role !== 'all' && !(u.roles ?? []).includes(role)) return false;
      if (!needle) return true;
      return [u.name, u.userId, u.email].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [users.data, q, role]);

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">People</h1>
          <p className="mt-2 text-[15px] text-graphite-soft">
            {users.data ? `${plural(users.data.length, 'account')} on the platform.` : 'Loading accounts.'}
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
              onClick={() => setRole(r)}
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

      {adding && <AddPersonDialog onClose={() => setAdding(false)} />}
    </Page>
  );
}

const ROLE_TONE: Record<string, 'accent' | 'neutral' | 'review'> = { admin: 'review', teacher: 'accent', student: 'neutral' };

function UserRow({ u, isAdminMe, isMe }: { u: AdminUser; isAdminMe: boolean; isMe: boolean }) {
  const setActive = useSetUserActive();
  const [editing, setEditing] = useState(false);
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

function AddPersonDialog({ onClose }: { onClose: () => void }) {
  const add = useAddUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  const submit = async () => {
    await add.mutateAsync({ name, email, password, role });
    onClose();
  };
  const ready = name.trim() && /.+@.+\..+/.test(email) && password.length >= 8;

  return (
    <Dialog open onClose={onClose} title="Add a person">
      <div className="grid gap-3">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} hint="At least 8 characters" />
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
