import type { ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { canManageUsers, canTeach, isAdmin, isStaff, useAuth } from '../auth/auth';
import { ThemeToggle } from './ThemeToggle';
import { Button, Spinner, Wordmark } from './ui';

// The workspaces the signed-in user can switch between, in the header
function NavLinks() {
  const { user } = useAuth();
  const links: { to: string; label: string }[] = [];
  if (canTeach(user)) links.push({ to: '/teach', label: 'Tests' });
  if (canManageUsers(user)) links.push({ to: '/admin', label: 'Admin' });
  if (links.length < 2) return null;
  return (
    <nav className="mr-1 hidden items-center gap-1 sm:flex">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              isActive ? 'bg-sheet-2 text-graphite' : 'text-graphite-soft hover:text-graphite'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Header({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <header className="glass sticky top-0 z-40 border-b border-rule/70">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Wordmark />
        <div className="ml-auto flex items-center gap-1.5">
          {children}
          <NavLinks />
          <ThemeToggle />
          {user && (
            <>
              <span className="hidden px-2 text-sm font-medium text-graphite-soft sm:inline">{user.name}</span>
              <Button variant="quiet" onClick={signOut}>Sign out</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Pages that need a signed-in student; others go to the sign-in page and come back after
export function RequireAuth() {
  const { signedIn, loading } = useAuth();
  const location = useLocation();
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Spinner />
      </div>
    );
  }
  return <Outlet />;
}

// Pages for teachers and other staff; students are sent to their own start page
export function RequireStaff() {
  const { user } = useAuth();
  if (!isStaff(user)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// The admin area: only the platform-management roles reach it
export function RequireManagement() {
  const { user } = useAuth();
  if (!canManageUsers(user)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Platform settings are admin-only, tighter than the rest of the admin area
export function RequireAdmin() {
  const { user } = useAuth();
  if (!isAdmin(user)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="rise mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">{children}</main>
    </>
  );
}
