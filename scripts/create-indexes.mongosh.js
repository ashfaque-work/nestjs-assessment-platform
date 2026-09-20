// Creates the indexes that back the app's hot query paths. The schemas set autoIndex: false, so
// Mongoose does not build them at startup; this script does, in the background, so it is safe to
// run against a live database. createIndex is idempotent, so re-running it is a no-op.
//
// Run once per instance database (stagingdb, newstagingdb, ...):
//
//   mongosh <database> scripts/create-indexes.mongosh.js
//
// The declarations here mirror the schema.index() calls in libs/common/src/database/models.

const indexes = [
  // A student's own attempts and results (the results list is sorted by createdAt), how many
  // times they took a test, and a test's leaderboard/summary across everyone.
  ['attempts', { user: 1, practicesetId: 1 }],
  ['attempts', { user: 1, createdAt: -1 }],
  ['attempts', { practicesetId: 1, isAbandoned: 1 }],
  // Attempt details joined back from their attempt by the summary/result aggregations.
  ['attemptdetails', { attempt: 1 }],
  // Sign-in looks a user up by login or email on every request.
  ['users', { userId: 1 }, { sparse: true }],
  ['users', { email: 1 }, { sparse: true }],
  // The classrooms a user teaches (invitation-access checks), and a centre head's by location.
  ['classrooms', { user: 1 }],
  ['classrooms', { owners: 1 }],
  ['classrooms', { location: 1 }],
];

for (const [collection, keys, options] of indexes) {
  const opts = Object.assign({ background: true }, options || {});
  const name = db[collection].createIndex(keys, opts);
  print(`${db.getName()}.${collection}: ${name}  ${JSON.stringify(keys)}`);
}

print('done');
