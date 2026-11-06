import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tests set DB_PATH=':memory:' so they never touch the real database file
const db = new Database(
    process.env.DB_PATH ?? path.join(__dirname, 'queuesmart.db')
);

db.pragma('foreign_keys = ON');

// Every statement in schema.sql uses IF NOT EXISTS, so this is safe on every start
db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

if (process.env.DB_PATH !== ':memory:') {
    console.log('Connected to QueueSmart database!');
}

export default db;
