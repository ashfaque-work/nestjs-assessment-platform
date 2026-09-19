// Gives every answer option its own _id in questions where the options share one.
//
// Until the question schema's defaults were fixed, a running service created every answer
// option (and test case, coding entry, ...) with the same _id, so any answer to those questions
// was graded as correct. Run once per instance database:
//
//   mongosh <database> scripts/fix-duplicate-answer-ids.mongosh.js
//
// Attempts already graded against these questions keep their (wrong) marks: the id a student
// chose cannot be matched to one option any more.

const lists = ['answers', 'testcases', 'coding', 'audioFiles', 'answerExplainAudioFiles'];
let fixed = 0;

db.questions.find({}).forEach((question) => {
  const update = {};
  for (const field of lists) {
    const items = question[field];
    if (!Array.isArray(items) || items.length < 2) continue;
    const ids = items.map((item) => String(item && item._id));
    if (new Set(ids).size === ids.length) continue;
    update[field] = items.map((item) => ({ ...item, _id: new ObjectId() }));
  }
  if (Object.keys(update).length) {
    db.questions.updateOne({ _id: question._id }, { $set: update });
    fixed++;
  }
});

print(`questions fixed: ${fixed}`);
