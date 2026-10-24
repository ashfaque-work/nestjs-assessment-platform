// Repairs the shared sample account after restoring an older demo baseline.
// Run only against the demo databases, never against a production instance.
const databaseName = db.getName();
if (!['stagingdb', 'newstagingdb'].includes(databaseName)) {
  throw new Error(`Refusing to repair demo data in ${databaseName}`);
}

const demoEmail = 'demo-student@example.com';
const student = db.users.findOne({ email: demoEmail, userId: demoEmail, roles: 'student' });
if (!student) {
  if (databaseName === 'stagingdb') throw new Error('Demo student is missing from the baseline');
  print(`${databaseName}: no shared demo student; skipped`);
} else {
  const history = [...(student.levelHistory || [])];
  let changed = student.isActive !== true;
  for (const subjectId of student.subjects || []) {
    const entry = history.find((item) => String(item.subjectId) === String(subjectId));
    if (!entry) {
      history.push({ subjectId, level: 1, updateDate: new Date() });
      changed = true;
    } else if (!Number.isFinite(entry.level) || entry.level < 1) {
      entry.level = 1;
      entry.updateDate = new Date();
      changed = true;
    }
  }
  if (changed) {
    const result = db.users.updateOne(
      { _id: student._id, email: demoEmail, userId: demoEmail, roles: 'student' },
      { $set: { isActive: true, levelHistory: history } },
    );
    if (result.matchedCount !== 1) throw new Error('Demo student changed during repair');
  }
  print(`${databaseName}: demo student active; initial subject levels ready`);
}
