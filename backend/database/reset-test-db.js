import db from './db.js';
import { readFileSync } from 'fs';

if (process.env.NODE_ENV !== 'test') {
  console.error('Database reset is only allowed in test mode.');
  process.exit(1);
}

const schema = readFileSync(
  new URL('./schema.sql', import.meta.url),
  'utf8'
);

const resetDatabase = db.transaction(() => {
  db.exec(`
    DELETE FROM QueueEntry;
    DELETE FROM Notification;
    DELETE FROM QueueHistory;
    DELETE FROM Queue;
    DELETE FROM UserProfile;
    DELETE FROM UserCredentials;
    DELETE FROM Service;
  `);

  db.exec(schema);
  
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('Service', 'Queue', 'QueueEntry', 'QueueHistory', 'Notification', 'UserCredentials', 'UserProfile')");

  const insert = db.prepare(`
    INSERT INTO Service
      (service_name, description, expected_duration, priority_level)
    VALUES (?, ?, ?, ?)
  `);

  insert.run(
    'Express Oil Change',
    'A quick oil change service',
    15,
    'medium'
  );

  insert.run(
    'Full Synthetic Service',
    'Full synthetic oil change',
    30,
    'medium'
  );

  insert.run(
    'Tire Rotation & Inspection',
    'Tire rotation and vehicle inspection',
    20,
    'low'
  );
});

db.exec(schema);
resetDatabase();

console.log('Test database reset successfully!');
console.table(
  db.prepare('SELECT * FROM Service').all()
);

db.close();
