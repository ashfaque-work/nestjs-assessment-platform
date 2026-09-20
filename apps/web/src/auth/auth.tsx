import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import { useMe } from '../api/hooks';
import type { Me } from '../api/types';

interface Auth {
  user: Me | undefined;
  signedIn: boolean;
  loading: boolean;
  signIn: (userId: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStore.get());
  const me = useMe(!!token);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => setUnauthorizedHandler(signOut), [signOut]);

  const signIn = useCallback(async (userId: string, password: string) => {
    const { token } = await api<{ token: string }>('POST', '/auth/login', { userId, password });
    tokenStore.set(token);
    queryClient.clear();
    setToken(token);
  }, [queryClient]);

  const value = useMemo<Auth>(
    () => ({ user: me.data, signedIn: !!token, loading: !!token && me.isPending, signIn, signOut }),
    [me.data, me.isPending, token, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Anyone who is not only a student uses the teaching side
export const isStaff = (user: Me | undefined) => !!user && user.roles.some((role) => role !== 'student');

// The roles that run the platform: they get the admin area
const MANAGEMENT_ROLES = ['admin', 'director', 'operator', 'centerHead', 'support'];
export const hasRole = (user: Me | undefined, roles: string[]) => !!user && user.roles.some((r) => roles.includes(r));
export const isAdmin = (user: Me | undefined) => hasRole(user, ['admin']);
// Who may open the admin area at all (Users); platform Settings stays admin-only inside it
export const canManageUsers = (user: Me | undefined) => hasRole(user, MANAGEMENT_ROLES);
// A staff member who runs tests (the teaching workspace)
export const canTeach = (user: Me | undefined) => hasRole(user, ['admin', 'teacher', 'mentor', 'publisher', 'director', 'centerHead', 'operator', 'support']);

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
