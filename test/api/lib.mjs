// Helpers shared by the API suites: HTTP calls to the gateway, sign-in, the test database, checks.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { MongoClient, ObjectId } = require('mongodb');

export { ObjectId };
export const BASE = process.env.API_BASE ?? 'http://localhost:8000';
export const MONGO = process.env.API_TEST_MONGO ?? 'mongodb://127.0.0.1:27017';
export const DB_NAME = process.env.API_TEST_DB ?? 'stagingdb';
export const INSTANCE = process.env.API_TEST_INSTANCE ?? 'staging';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The fixed test data (see seed.mjs)
export { SEED } from './seed.mjs';

export async function call(method, urlPath, body, token) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: { 'content-type': 'application/json', instancekey: INSTANCE, ...(token ? { authtoken: token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, text };
}

export async function login(email, password) {
  const r = await call('POST', '/auth/login', { userId: email, password });
  if (r.status === 429) throw new Error('Login rate limit hit: run the gateway with LOGIN_THROTTLE_LIMIT=100000 for the API suites');
  return r.data?.token;
}

let client;
export async function db() {
  client ??= await MongoClient.connect(MONGO);
  return client.db(DB_NAME);
}
export async function closeDb() {
  await client?.close();
  client = undefined;
}

// A suite: named checks; the run fails if any check fails
export function suite(name) {
  let failed = 0;
  let passed = 0;
  console.log(`\n# ${name}`);
  return {
    check(label, ok, detail) {
      if (ok) {
        passed++;
        console.log(`  PASS  ${label}`);
      } else {
        failed++;
        console.log(`  FAIL  ${label}  -> ${String(JSON.stringify(detail)).slice(0, 400)}`);
      }
    },
    done() {
      console.log(`  ${passed} passed, ${failed} failed`);
      return { passed, failed };
    },
  };
}
