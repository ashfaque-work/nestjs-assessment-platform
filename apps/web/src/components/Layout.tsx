import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isStaff, useAuth } from '../auth/auth';
import { ThemeToggle } from './ThemeToggle';
import { Button, Spinner, Wordmark } from './ui';

export function Header({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <header className="border-b border-rule bg-sheet">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Wordmark />
        <div className="ml-auto flex items-center gap-1">
          {children}
          <ThemeToggle />
          {user && (
            <>
              <span className="hidden px-2 text-sm text-graphite-soft sm:inline">{user.name}</span>
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

export function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">{children}</main>
    </>
  );
}
