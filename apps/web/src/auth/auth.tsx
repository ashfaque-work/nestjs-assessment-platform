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

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
