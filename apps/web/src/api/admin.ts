import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AdminUser, WhiteLabel } from './types';

export interface UserQuery {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  activeOnly?: boolean;
}

// One page of people, filtered and searched by the API, with how many match in all.
// Deactivated people are included unless asked otherwise, so an admin can reactivate them.
async function fetchUsers({ page = 1, limit = 50, role, search, activeOnly }: UserQuery) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit), count: 'true' });
  if (!activeOnly) q.set('includeInactive', 'true');
  if (role) q.set('roles', role);
  if (search) q.set('searchText', search);
  const r = await api<{ users?: AdminUser[]; count?: number }>('GET', `/auth/users?${q}`);
  return { users: r.users ?? [], count: r.count ?? 0 };
}

export function useAdminUsers(query: UserQuery) {
  return useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () => fetchUsers(query),
    placeholderData: keepPreviousData,
  });
}

// Head counts for the overview: everyone, the active, and each role
export function useUserCounts(roles: string[]) {
  return useQuery({
    queryKey: ['admin', 'users', 'counts', roles],
    queryFn: async () => {
      const count = async (q: UserQuery) => (await fetchUsers({ ...q, limit: 1 })).count;
      const [total, active, ...perRole] = await Promise.all([
        count({}),
        count({ activeOnly: true }),
        ...roles.map((role) => count({ role })),
      ]);
      return { total, active, byRole: roles.map((role, i) => [role, perRole[i]] as const).filter(([, n]) => n > 0) };
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

// Change a user's roles (admin only). Replaces the whole set.
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => api('PUT', `/auth/${id}/role`, { newRoles: roles }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// Create an account (admin/director/support). The API wants the login on both userId and email,
// and the role on both roles and userRoles.
export function useAddUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string; role: string }) =>
      api('POST', '/auth/addUser', {
        name: input.name,
        userId: input.email,
        email: input.email,
        password: input.password,
        roles: [input.role],
        userRoles: [input.role],
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
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
