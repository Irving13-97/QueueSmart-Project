-- 1. User login credentials
CREATE TABLE IF NOT EXISTS UserCredentials (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'User'
        CHECK (role IN ('User', 'Administrator'))
);

-- 2. User profile information
CREATE TABLE IF NOT EXISTS UserProfile (
    profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    contact_info TEXT,
    preferences TEXT,
    FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id)
        ON DELETE CASCADE
);

-- 3. Services offered
CREATE TABLE IF NOT EXISTS Service (
    service_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    description TEXT,
    expected_duration INTEGER NOT NULL
        CHECK (expected_duration > 0),
    priority_level TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority_level IN ('low', 'medium', 'high'))
);

-- 4. Queues for services
CREATE TABLE IF NOT EXISTS Queue (
    queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES Service(service_id)
);

-- 5. Customers waiting in queues
CREATE TABLE IF NOT EXISTS QueueEntry (
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

-- 6. Notifications
CREATE TABLE IF NOT EXISTS Notification (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'viewed')),
    FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id)
);

-- 7. Queue history
CREATE TABLE IF NOT EXISTS QueueHistory (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL
        CHECK (status IN ('served', 'canceled')),
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id),
    FOREIGN KEY (service_id) REFERENCES Service(service_id)
);
