// The countdown shown during a test: 19:05, or 1:02:09 past an hour
export function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

// A duration in words: "45 s", "2 min 10 s", "1 h 5 min"
export function duration(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 1) return 'under 1 s';
  if (total < 60) return `${total} s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return m ? `${h} h ${m} min` : `${h} h`;
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

// Marks can be fractional (partial marking): show 2.5, not 2.5000001
export function marks(n: number): string {
  return String(Math.round(n * 100) / 100);
}

// The API sends dates as "Sat Sep 19 2026 01:14:55 GMT+0000 (Coordinated Universal Time)",
// which not every browser parses; drop the zone name first
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value.replace(/\s*\(.*\)\s*$/, ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function day(value: string | undefined): string {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Option letters as printed on an answer sheet
export const letter = (index: number) => String.fromCharCode(65 + index);
