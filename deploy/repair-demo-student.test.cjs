const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(__dirname + '/repair-demo-student.mongosh.js', 'utf8');

function run(databaseName, student) {
  const writes = [];
  vm.runInNewContext(code, {
    db: {
      getName: () => databaseName,
      users: {
        findOne(query) {
          assert.deepEqual(JSON.parse(JSON.stringify(query)), {
            email: 'demo-student@example.com', userId: 'demo-student@example.com', roles: 'student',
          });
          return student;
        },
        updateOne(query, update) {
          assert.equal(query._id, student._id);
          assert.equal(query.email, 'demo-student@example.com');
          assert.equal(query.roles, 'student');
          writes.push(update);
          return { matchedCount: 1 };
        },
      },
    },
    print() {},
  });
  return writes;
}

const legacy = { _id: 'demo', isActive: false, subjects: ['math', 'physics'], levelHistory: [] };
const [repair] = run('stagingdb', legacy);
assert.equal(repair.$set.isActive, true);
assert.deepEqual(Array.from(repair.$set.levelHistory, x => x.level), [1, 1]);
assert.equal(run('stagingdb', { ...legacy, ...repair.$set }).length, 0, 'second run must not write');

const existing = { ...legacy, isActive: true, levelHistory: [{ subjectId: 'math', level: 3 }, { subjectId: 'physics', level: 0 }] };
const [corrected] = run('stagingdb', existing);
assert.deepEqual(Array.from(corrected.$set.levelHistory, x => x.level), [3, 1], 'preserve higher levels');
assert.equal(run('newstagingdb', null).length, 0);
assert.throws(() => run('stagingdb', null), /missing/);
assert.throws(() => run('production', legacy), /Refusing/);
console.log('Demo repair checks passed: activation, levels, idempotency, identity and database scope.');
