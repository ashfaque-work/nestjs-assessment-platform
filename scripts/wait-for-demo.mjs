import { pathToFileURL } from 'node:url';
import { setTimeout } from 'node:timers/promises';

// Static pages and Swagger can be available while the auth microservice is down.
// A rejected, deliberately invalid login proves the auth request path is working.
export async function waitForDemo(baseUrl, {
  fetchImpl = fetch, sleep = setTimeout, log = console.log,
  attempts = 10, timeoutMs = 15_000, intervalMs = 10_000,
} = {}) {
  const url = new URL('/auth/login', baseUrl);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let status = 'unreachable';
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', instancekey: 'staging' },
        body: JSON.stringify({ userId: 'readiness-probe@example.invalid', password: 'invalid-readiness-probe' }),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error',
      });
      status = String(response.status);
      // Consume the body within the timeout; headers alone do not complete a request.
      const body = await response.text();
      let json;
      try { json = JSON.parse(body); } catch { /* A proxy error page is not readiness. */ }
      if (response.status === 401 && json && typeof json === 'object') {
        log('Demo authentication is ready (invalid login rejected with 401).');
        return;
      }
    } catch {
      // A timeout or connection failure is retried, but never treated as success.
    }
    log(`Auth readiness attempt ${attempt}/${attempts}: ${status}`);
    if (attempt < attempts) await sleep(intervalMs);
  }
  throw new Error('Demo authentication is unavailable; stopping before browser checks. Inspect gateway/auth and their MongoDB/Redis dependencies on the demo VM.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  waitForDemo(process.env.BASE_URL || 'https://assess.ashfaqueahmad.com').catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
