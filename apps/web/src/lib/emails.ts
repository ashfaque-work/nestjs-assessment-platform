// The emails typed for an invitation-only test: one list, lower case, no repeats
export function parseEmails(text: string): { emails: string[]; invalid: string[] } {
  const parts = text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const valid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  return { emails: [...new Set(parts.filter(valid))], invalid: parts.filter((e) => !valid(e)) };
}
