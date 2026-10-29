import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForDemo } from './wait-for-demo.mjs';

const quiet = { sleep: async () => {}, log: () => {} };

test('waits for authentication recovery instead of accepting static/proxy success', async () => {
  const statuses = [200, 503, 429, 401];
  let calls = 0;
  await waitForDemo('https://demo.example/login', {
    ...quiet, attempts: 4,
    fetchImpl: async (url, options) => {
      assert.equal(url.href, 'https://demo.example/auth/login');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.instancekey, 'staging');
      assert.equal(JSON.parse(options.body).userId, 'readiness-probe@example.invalid');
      return new Response('{"message":"Unavailable or invalid credentials"}', { status: statuses[calls++] });
    },
  });
  assert.equal(calls, 4);
});

test('fails closed when the backend never recovers', async () => {
  let calls = 0;
  await assert.rejects(waitForDemo('https://demo.example', {
    ...quiet, attempts: 2,
    fetchImpl: async () => { calls++; return new Response('{}', { status: 503 }); },
  }), /authentication is unavailable/);
  assert.equal(calls, 2);
});

test('retries network errors and rejects non-JSON unauthorized proxy pages', async () => {
  let calls = 0;
  await waitForDemo('https://demo.example', {
    ...quiet, attempts: 3,
    fetchImpl: async () => {
      if (++calls === 1) throw new TypeError('connection failed');
      return new Response(calls === 2 ? '<html>Unauthorized</html>' : '{"message":"Invalid credentials"}', { status: 401 });
    },
  });
  assert.equal(calls, 3);
});
