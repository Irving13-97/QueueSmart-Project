import db from '../database/db.js';

// Each test file gets its own in-memory database, so seed the same services as database/seed.js
const insertService = db.prepare(`
  INSERT INTO Service (service_name, description, expected_duration, priority_level)
  VALUES (?, ?, ?, ?)
`);

if (db.prepare('SELECT COUNT(*) AS total FROM Service').get().total === 0) {
  insertService.run('Express Oil Change', 'A quick oil change service', 15, 'medium');
  insertService.run('Full Synthetic Service', 'Full synthetic oil change', 30, 'medium');
  insertService.run('Tire Rotation & Inspection', 'Tire rotation and vehicle inspection', 20, 'low');
}
