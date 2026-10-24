// Runs the API suites against a running stack. Each suite starts from fresh seed data.
//
//   node test/api/run.mjs                 all suites
//   node test/api/run.mjs attempts        one suite (file name in suites/, without .mjs)
//
// See the README ("API tests") for starting the stack the suites expect.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE, DB_NAME, MONGO, closeDb, suite } from './lib.mjs';
import { seed } from './seed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const wanted = process.argv.slice(2);
const files = fs.readdirSync(path.join(here, 'suites')).filter((f) => f.endsWith('.mjs'))
  .filter((f) => !wanted.length || wanted.includes(f.replace(/\.mjs$/, ''))).sort();

try {
  await fetch(`${BASE}/api`);
} catch {
  console.error(`The gateway is not reachable at ${BASE}. Start the stack first (see the README).`);
  process.exit(2);
}

let failed = 0;
let passed = 0;
for (const file of files) {
  await closeDb();
  await seed(MONGO, DB_NAME);
  const mod = await import(pathToFileURL(path.join(here, 'suites', file)).href);
  const s = suite(mod.name ?? file);
  try {
    await mod.run(s);
  } catch (error) {
    s.check(`suite ran to the end (${error?.message ?? error})`, false, error?.stack);
  }
  const r = s.done();
  failed += r.failed;
  passed += r.passed;
}
await closeDb();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
