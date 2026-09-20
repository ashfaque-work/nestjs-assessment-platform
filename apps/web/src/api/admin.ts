import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AdminUser, WhiteLabel } from './types';

// The people on the platform. The list is small at demo scale, so we load a page and search on
// the client; the query still passes a role filter through to the API.
export function useAdminUsers(role?: string) {
  return useQuery({
    queryKey: ['admin', 'users', role ?? 'all'],
    queryFn: async () => {
      const q = new URLSearchParams({ page: '1', limit: '200' });
      if (role) q.set('roles', role);
      return (await api<{ users: AdminUser[] }>('GET', `/auth/users?${q}`)).users ?? [];
    },
  });
}

// Activate or deactivate a user (a deactivated user cannot sign in).
export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api('PUT', `/auth/updateUserStatus/${id}`, { _id: id, isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useOnlineUsers() {
  return useQuery({
    queryKey: ['admin', 'online'],
    queryFn: async () => {
      const r = await api<{ response?: unknown[]; users?: unknown[] } | unknown[]>('GET', '/auth/onlineUsers');
      const list = Array.isArray(r) ? r : (r.response ?? r.users ?? []);
      return Array.isArray(list) ? list.length : 0;
    },
    retry: false,
  });
}

export function useWhiteLabel() {
  return useQuery({
    queryKey: ['admin', 'whiteLabel'],
    queryFn: async () => (await api<{ response: WhiteLabel }>('GET', '/settings/getWhiteLabel')).response,
  });
}

// Save the platform settings. The API replaces the whiteLabel document, so we send the loaded
// settings merged with the edited fields rather than the changed fields alone.
export function useSaveWhiteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: WhiteLabel) => api('PUT', '/settings/update', settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'whiteLabel'] }),
  });
}
