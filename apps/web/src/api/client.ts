// Every request carries the instance (tenant) key; signed-in requests also carry the token.
const INSTANCE_KEY = import.meta.env.VITE_INSTANCE_KEY ?? 'staging';
const TOKEN_KEY = 'authtoken';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode: the session lasts until the tab closes */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing stored */
    }
  },
};

// Set by the auth provider so an expired token signs the student out wherever it happens
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// The gateway answers errors as { message }, where message is a string, a list of strings, or a
// list of { message } objects
const textOf = (item: unknown): string =>
  typeof item === 'string' ? item : typeof (item as { message?: unknown })?.message === 'string' ? (item as { message: string }).message : '';

export function messageFrom(body: unknown, status: number): string {
  const raw = (body as { message?: unknown } | null)?.message;
  const message = (Array.isArray(raw) ? raw.map(textOf) : [textOf(raw)]).filter(Boolean).join(', ');
  if (message && !/internal server error/i.test(message)) return message;
  if (status === 0) return 'Could not reach the server. Check your connection and try again.';
  if (status >= 500) return 'The server could not complete this. Try again in a moment.';
  if (status === 403) return 'You do not have access to this.';
  if (status === 404) return 'This could not be found.';
  return 'Something went wrong. Try again.';
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: {
        'content-type': 'application/json',
        instancekey: INSTANCE_KEY,
        ...(token ? { authtoken: token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, messageFrom(null, 0));
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, messageFrom(data, res.status));
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
