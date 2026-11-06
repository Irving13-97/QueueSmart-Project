import db from './db.js';

const columns = db.prepare(
  'PRAGMA table_info(QueueHistory)'
).all();

const hasCustomerId = columns.some(
  column => column.name === 'customer_id'
);

const tableSQL = db.prepare(`
  SELECT sql FROM sqlite_master
  WHERE type = 'table' AND name = 'QueueHistory'
`).get()?.sql ?? '';

const supportsLeft = tableSQL.includes("'left'");

if (hasCustomerId && supportsLeft) {
  console.log('QueueHistory table is already up to date.');
} else {
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE QueueHistory_new (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        user_id INTEGER,
        service_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('served', 'left', 'canceled')),
        completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id),
        FOREIGN KEY (service_id) REFERENCES Service(service_id)
      );
    `);

    db.exec(`
      INSERT INTO QueueHistory_new (
        history_id,
        customer_id,
        user_id,
        service_id,
        customer_name,
        status,
        completed_at
      )
      SELECT
        history_id,
        ${hasCustomerId ? 'customer_id' : 'NULL'},
        user_id,
        service_id,
        customer_name,
        status,
        completed_at
      FROM QueueHistory;
    `);

    db.exec('DROP TABLE QueueHistory;');
    db.exec('ALTER TABLE QueueHistory_new RENAME TO QueueHistory;');
  });

  migrate();

  console.log('QueueHistory migration completed successfully!');
}
