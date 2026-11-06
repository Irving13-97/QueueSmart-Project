import db from './db.js';

const columns = db.prepare('PRAGMA table_info(Notification)').all();
const hasColumn = name => columns.some(column => column.name === name);

const userIdColumn = columns.find(column => column.name === 'user_id');

if (!userIdColumn) {
  throw new Error('Notification table is missing user_id.');
}

const needsMigration =
  userIdColumn.notnull !== 0 ||
  !hasColumn('customer_id') ||
  !hasColumn('service_id') ||
  !hasColumn('type');

if (!needsMigration) {
  console.log('Notification table is already up to date.');
} else {
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE Notification_new (
        notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_id INTEGER,
        service_id INTEGER,
        type TEXT NOT NULL DEFAULT 'status'
          CHECK (type IN ('joined', 'almost_ready', 'status')),
        message TEXT NOT NULL
          CHECK (length(message) BETWEEN 1 AND 200),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'sent'
          CHECK (status IN ('sent', 'viewed')),
        FOREIGN KEY (user_id)
          REFERENCES UserCredentials(user_id)
          ON DELETE CASCADE,
        FOREIGN KEY (service_id)
          REFERENCES Service(service_id)
          ON DELETE SET NULL
      );
    `);

    db.exec(`
      INSERT INTO Notification_new (
        notification_id,
        user_id,
        customer_id,
        service_id,
        type,
        message,
        created_at,
        status
      )
      SELECT
        notification_id,
        user_id,
        ${hasColumn('customer_id') ? 'customer_id' : 'NULL'},
        ${hasColumn('service_id') ? 'service_id' : 'NULL'},
        ${hasColumn('type') ? 'type' : "'status'"},
        message,
        created_at,
        status
      FROM Notification;
    `);

    db.exec('DROP TABLE Notification;');
    db.exec('ALTER TABLE Notification_new RENAME TO Notification;');
  });

  migrate();

  console.log('Notification migration completed successfully!');
}

console.table(db.prepare('PRAGMA table_info(Notification)').all());
