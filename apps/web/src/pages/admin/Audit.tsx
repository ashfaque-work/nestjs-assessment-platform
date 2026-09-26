import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Page } from '../../components/Layout';
import { Button, Card, ErrorNote, Spinner } from '../../components/ui';
import { plural } from '../../lib/format';
import { when } from '../../lib/availability';

interface AuditEntry {
  _id: string;
  actorName?: string;
  action: string;
  targetName?: string;
  details?: string;
  createdAt?: string;
}

const PAGE_SIZE = 50;
const ACTION_LABELS: Record<string, string> = {
  'user.add': 'Added a person',
  'user.edit': 'Edited a person',
  'user.roles': 'Changed roles',
  'user.status': 'Changed access',
  'settings.update': 'Changed platform settings',
};

// Who changed what, newest first: people added, edited, their roles and access, and the settings
export function AdminAudit() {
  const [page, setPage] = useState(1);
  const log = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: async () => {
      const r = await api<{ entries?: AuditEntry[]; count?: number }>('GET', `/auth/audit?page=${page}&limit=${PAGE_SIZE}`);
      return { entries: r.entries ?? [], count: r.count ?? 0 };
    },
    placeholderData: keepPreviousData,
  });
  const pages = Math.max(1, Math.ceil((log.data?.count ?? 0) / PAGE_SIZE));

  return (
    <Page>
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">Audit log</h1>
      <p className="mt-2 text-[15px] text-graphite-soft">
        {log.data ? `${plural(log.data.count, 'change')} recorded, newest first.` : 'What account managers changed, newest first.'}
      </p>
      {log.isPending && <Spinner label="Loading the log" />}
      {log.isError && <ErrorNote message={log.error.message} />}
      {log.data && (
        <Card className="mt-6 overflow-x-auto">
          {log.data.entries.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-graphite-soft">Nothing has been changed yet.</p>
          ) : (
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b border-rule text-xs text-graphite-soft">
                  <th scope="col" className="px-5 py-3 font-semibold">When</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Who</th>
                  <th scope="col" className="px-5 py-3 font-semibold">What</th>
                  <th scope="col" className="px-5 py-3 font-semibold">To whom</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {log.data.entries.map((e) => (
                  <tr key={e._id} className="border-b border-rule last:border-0">
                    <td className="figures whitespace-nowrap px-5 py-3 text-graphite-soft">{e.createdAt ? when(new Date(e.createdAt)) : ''}</td>
                    <td className="px-5 py-3 font-semibold">{e.actorName || '—'}</td>
                    <td className="px-5 py-3">{ACTION_LABELS[e.action] ?? e.action}</td>
                    <td className="px-5 py-3">{e.targetName || '—'}</td>
                    <td className="px-5 py-3 text-graphite-soft">{e.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
          <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Newer</Button>
          <span className="figures text-graphite-soft">Page {page} of {pages}</span>
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>Older</Button>
        </nav>
      )}
    </Page>
  );
}
