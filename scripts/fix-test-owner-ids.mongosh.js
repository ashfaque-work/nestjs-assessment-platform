// Stores the owner of each test (practicesets.user) as an ObjectId again.
//
// Editing a test used to copy `user` from the request body, which saved it as a string; owner
// queries compare with an ObjectId, so the test disappeared from its teacher's list. Run once
// per instance database:
//
//   mongosh <database> scripts/fix-test-owner-ids.mongosh.js

let fixed = 0;
db.practicesets.find({ user: { $type: 'string' } }).forEach((test) => {
  if (/^[0-9a-f]{24}$/i.test(test.user)) {
    db.practicesets.updateOne({ _id: test._id }, { $set: { user: new ObjectId(test.user) } });
    fixed++;
  }
});
print(`tests fixed: ${fixed}`);
