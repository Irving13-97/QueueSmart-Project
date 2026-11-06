import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseFile = process.env.NODE_ENV === 'test'
    ? 'queuesmart.test.db'
    : 'queuesmart.db';

const databasePath = process.env.DB_PATH
    ?? path.join(__dirname, databaseFile);

const db = new Database(databasePath);

db.pragma('foreign_keys = ON');

db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

if (databasePath !== ':memory:') {
    console.log(`Connected to QueueSmart database: ${databaseFile}`);
}

export default db;
