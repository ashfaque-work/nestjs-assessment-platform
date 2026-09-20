import { useMemo, useState } from 'react';
import { useAdminUsers, useSetUserActive } from '../../api/admin';
import type { AdminUser } from '../../api/types';
import { isAdmin, useAuth } from '../../auth/auth';
import { Page } from '../../components/Layout';
import { Badge, Button, Card, ErrorNote, Spinner } from '../../components/ui';
import { plural } from '../../lib/format';

const ROLE_FILTERS = ['all', 'student', 'teacher', 'admin', 'mentor', 'publisher', 'operator', 'centerHead', 'director', 'support'];

export function AdminUsers() {
  const { user: me } = useAuth();
  const users = useAdminUsers();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');

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
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">People</h1>
      <p className="mt-2 text-[15px] text-graphite-soft">
        {users.data ? `${plural(users.data.length, 'account')} on the platform.` : 'Loading accounts.'}
      </p>

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
              {r === 'centerHead' ? 'centre head' : r}
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
            <UserRow key={u._id} u={u} canToggle={isAdmin(me) && u._id !== me?._id} isMe={u._id === me?._id} />
          ))}
        </Card>
      )}
    </Page>
  );
}

const ROLE_TONE: Record<string, 'accent' | 'neutral' | 'review'> = { admin: 'review', teacher: 'accent', student: 'neutral' };

function UserRow({ u, canToggle, isMe }: { u: AdminUser; canToggle: boolean; isMe: boolean }) {
  const setActive = useSetUserActive();
  const active = u.isActive !== false;
  const initials = (u.name ?? u.userId ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

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
      <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
        {(u.roles ?? []).map((r) => (
          <Badge key={r} tone={ROLE_TONE[r] ?? 'neutral'}>{r === 'centerHead' ? 'centre head' : r}</Badge>
        ))}
      </div>
      <div className="w-24 shrink-0 text-right">
        {canToggle ? (
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
    </div>
  );
}
