import db from './db.js';

const columns = db.prepare('PRAGMA table_info(QueueEntry)').all();

const hasCustomerName = columns.some(
  column => column.name === 'customer_name'
);

const userIdColumn = columns.find(
  column => column.name === 'user_id'
);

if (hasCustomerName && userIdColumn?.notnull === 0) {
  console.log('QueueEntry table is already up to date.');
} else {
  const count = db.prepare(
    'SELECT COUNT(*) AS total FROM QueueEntry'
  ).get().total;

  // Do not rebuild an old table containing records automatically.
  if (count > 0) {
    throw new Error(
      'QueueEntry contains existing records. Migration stopped to protect data.'
    );
  }

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE QueueEntry_new (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_id INTEGER NOT NULL,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        position INTEGER NOT NULL CHECK (position > 0),
        join_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'waiting'
          CHECK (status IN ('waiting', 'served', 'canceled')),
        FOREIGN KEY (queue_id) REFERENCES Queue(queue_id),
        FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id)
      );
    `);

    db.exec('DROP TABLE QueueEntry;');
    db.exec('ALTER TABLE QueueEntry_new RENAME TO QueueEntry;');
  });

  migrate();

  console.log('QueueEntry migration completed successfully!');
}

console.table(db.prepare('PRAGMA table_info(QueueEntry)').all());
