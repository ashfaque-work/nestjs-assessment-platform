import { Link } from 'react-router-dom';
import { useAdminUsers, useOnlineUsers } from '../../api/admin';
import { canManageUsers, isAdmin, useAuth } from '../../auth/auth';
import { Page } from '../../components/Layout';
import { Badge, Card, ErrorNote, Spinner } from '../../components/ui';
import { plural } from '../../lib/format';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admins', teacher: 'Teachers', student: 'Students', mentor: 'Mentors',
  publisher: 'Publishers', operator: 'Operators', centerHead: 'Centre heads', director: 'Directors', support: 'Support',
};

export function AdminHome() {
  const { user } = useAuth();
  const users = useAdminUsers();
  const online = useOnlineUsers();
  const firstName = user?.name?.split(' ')[0];

  const byRole = new Map<string, number>();
  for (const u of users.data ?? []) for (const r of u.roles ?? []) byRole.set(r, (byRole.get(r) ?? 0) + 1);
  const active = (users.data ?? []).filter((u) => u.isActive !== false).length;
  const roleRows = [...byRole.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Page>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{firstName ? `Hello, ${firstName}` : 'Admin'}</h1>
        <Badge tone="accent">Admin</Badge>
      </div>
      <p className="mt-2 text-[15px] text-graphite-soft">Manage the people on the platform and its settings.</p>

      {users.isError && <ErrorNote message={users.error.message} />}
      {users.isPending && <Spinner label="Loading overview" />}

      {users.data && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Stat label="People" value={String(users.data.length)} />
            <Stat label="Active" value={String(active)} />
            <Stat label="Online now" value={online.data === undefined ? '—' : String(online.data)} accent />
            <Stat label="Roles" value={String(byRole.size)} />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-graphite-soft">By role</h2>
              <ul className="mt-3 space-y-2.5">
                {roleRows.map(([role, n]) => (
                  <li key={role} className="flex items-center justify-between text-sm">
                    <span>{ROLE_LABELS[role] ?? role}</span>
                    <span className="figures font-semibold">{n}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              {canManageUsers(user) && (
                <QuickLink to="/admin/users" title="People" body={`Manage the ${plural(users.data.length, 'account')}: roles, access, activation.`} />
              )}
              {isAdmin(user) && (
                <QuickLink to="/admin/settings" title="Platform settings" body="Branding, sign-up, support email and feature switches." />
              )}
              <QuickLink to="/teach" title="Tests" body="Open the teaching workspace to write and review tests." />
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-graphite-soft">{label}</p>
      <p className={`figures mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${accent ? 'accent-text' : ''}`}>{value}</p>
    </Card>
  );
}

function QuickLink({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link to={to} className="group">
      <Card className="flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-pop">
        <h3 className="flex items-center gap-1.5 text-lg font-bold">
          {title}
          <span className="text-form transition-transform group-hover:translate-x-0.5">→</span>
        </h3>
        <p className="mt-1 text-sm text-graphite-soft">{body}</p>
      </Card>
    </Link>
  );
}
